import type { Match, Member } from "./types";

export type PaymentEmailMonth = {
	month: string;
	label: string;
	totalExpense: number;
	participants: string[];
};

export type PaymentEmailDraft = {
	to: string;
	cc: string;
	subject: string;
	body: string;
	months: PaymentEmailMonth[];
};

const TO = "cnb@vexere.com";
const CC = "hoainhan.nguyen@vexere.com";
const LOCATION = "sân số 10 Bế Văn Cấm, Quận 7";
const SENDER_NAME = "Nguyễn Quốc Vinh";

const sum = (items: { amount: number }[]) =>
	items.reduce((total, item) => total + (Number(item.amount) || 0), 0);

const formatVnd = (amount: number) =>
	`${new Intl.NumberFormat("vi-VN", {
		maximumFractionDigits: 0,
	}).format(amount)} VNĐ`;

const monthParts = (month: string) => ({
	number: String(Number(month.slice(5, 7))),
	year: month.slice(0, 4),
});

const monthLabel = (month: string) => {
	const { number, year } = monthParts(month);
	return `Tháng ${number}/${year}`;
};

const subjectMonthLabel = (months: string[]) => {
	const parts = months.map(monthParts);
	const years = [...new Set(parts.map((part) => part.year))];
	return years.length === 1
		? `${parts.map((part) => part.number).join(",")}/${years[0]}`
		: parts.map((part) => `${part.number}/${part.year}`).join(", ");
};

export const buildPaymentEmailDraft = ({
	months,
	matches,
	members,
}: {
	months: string[];
	matches: Match[];
	members: Member[];
}): PaymentEmailDraft => {
	if (months.length < 1 || months.length > 2 || new Set(months).size !== months.length) {
		throw new Error("Vui lòng chọn một hoặc hai tháng khác nhau.");
	}
	if (months.some((month) => !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))) {
		throw new Error("Tháng thanh toán không hợp lệ.");
	}
	const selectedMonths = [...months].sort();
	const memberNames = new Map(members.map((member) => [member.id, member.name]));
	const reports = selectedMonths.map((month) => {
		const monthMatches = matches
			.filter((match) => match.startsAt.slice(0, 7) === month)
			.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
		const participants = new Set<string>();
		for (const match of monthMatches) {
			for (const memberId of match.attendanceIds) {
				const name = memberNames.get(memberId);
				if (name) participants.add(name);
			}
		}
		return {
			month,
			label: monthLabel(month),
			totalExpense: sum(monthMatches.flatMap((match) => match.expenseItems)),
			participants: [...participants],
		};
	});
	const total = reports.reduce((amount, report) => amount + report.totalExpense, 0);
	const lines = [
		"Hi anh Nhân,",
		"",
		`Em gửi anh danh sách thành viên tham gia và hóa đơn CLB Cầu lông tại ${LOCATION}, nhờ anh làm thanh toán với nha.`,
	];
	for (const report of reports) {
		lines.push(
			"",
			`🔹 ${report.label}`,
			"",
			`Chi phí tổng cộng: ${formatVnd(report.totalExpense)}.`,
			"Hóa đơn: Đính kèm bên dưới",
			`Thành viên tham gia (${report.participants.length}):`,
			...report.participants,
		);
	}
	lines.push("", `Tổng cộng: ${formatVnd(total)}`, "Cảm ơn anh nhiều!");
	const subject = `HR - Đề xuất thanh toán Chi Phí Cầu Lông Tháng ${subjectMonthLabel(selectedMonths)} - ${SENDER_NAME}`;
	return {
		to: TO,
		cc: CC,
		subject,
		body: lines.join("\n"),
		months: reports,
	};
};

export const paymentEmailGmailUrl = (draft: PaymentEmailDraft) => {
	const params = new URLSearchParams({
		view: "cm",
		fs: "1",
		to: draft.to,
		cc: draft.cc,
		su: draft.subject,
		body: draft.body,
	});
	return `https://mail.google.com/mail/u/0/?${params.toString()}`;
};
