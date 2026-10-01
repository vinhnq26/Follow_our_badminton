import type { ExpenseCategory, Match, Member } from "./types";

type GroupReportInfo = {
	name: string;
	address: string;
	defaultVenue: string;
};

type ReportLine = {
	id: string;
	label: string;
	amount: number;
};

type ReportExpenseLine = ReportLine & {
	category: ExpenseCategory;
	categoryLabel: string;
};

export type GroupBackupSnapshot = {
	version: 1;
	exportedAt: string;
	group: GroupReportInfo;
	members: Member[];
	matches: Match[];
};

export type MonthlyReportSnapshot = {
	month: string;
	monthLabel: string;
	generatedAt: string;
	group: GroupReportInfo;
	matches: Array<{
		id: string;
		startsAt: string;
		date: string;
		time: string;
		venue: string;
		address: string;
		courtNumber: string;
		attendanceCount: number;
		incomeItems: ReportLine[];
		expenseItems: ReportExpenseLine[];
		totalIncome: number;
		totalExpense: number;
		balance: number;
		notes?: string;
	}>;
	totals: {
		totalIncome: number;
		totalExpense: number;
		balance: number;
	};
};

const expenseLabels: Record<ExpenseCategory, string> = {
	court: "Tiền sân",
	water: "Nước",
	shuttlecock: "Cầu",
	other: "Khác",
};

const sum = (items: { amount: number }[]) =>
	items.reduce((total, item) => total + (Number(item.amount) || 0), 0);

const formatDate = (date: string) =>
	new Intl.DateTimeFormat("vi-VN", {
		weekday: "long",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(new Date(date));

const formatTime = (date: string) =>
	new Intl.DateTimeFormat("vi-VN", {
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(date));

const formatDayMonth = (date: string) =>
	new Intl.DateTimeFormat("vi-VN", {
		day: "numeric",
		month: "numeric",
	}).format(new Date(date));

const formatCompactVnd = (amount: number) => {
	if (!amount) return "0đ";
	return `${new Intl.NumberFormat("vi-VN", {
		maximumFractionDigits: 1,
	}).format(amount / 1000)}k`;
};

const formatVnd = (amount: number) =>
	`${new Intl.NumberFormat("vi-VN", {
		style: "currency",
		currency: "VND",
		maximumFractionDigits: 0,
	}).format(amount)}`;

const lowerFirst = (value: string) =>
	value ? value.charAt(0).toLocaleLowerCase("vi-VN") + value.slice(1) : value;

const expenseDescription = (label: string, category: ExpenseCategory) => {
	const categoryLabel = expenseLabels[category];
	return label.trim().toLocaleLowerCase("vi-VN") ===
		categoryLabel.toLocaleLowerCase("vi-VN")
		? lowerFirst(categoryLabel)
		: label.trim();
};

const lineDescription = (line: ReportLine) =>
	`${formatCompactVnd(line.amount)} ${lowerFirst(line.label || "Khoản thu")}`.trim();

export const buildMonthlyReportSnapshot = ({
	month,
	monthLabel,
	matches,
	group,
}: {
	month: string;
	monthLabel: string;
	matches: Match[];
	group: GroupReportInfo;
}): MonthlyReportSnapshot => {
	const reportMatches = [...matches]
		.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
		.map((match) => {
			const incomeItems = match.incomeItems.map(({ id, label, amount }) => ({
				id,
				label,
				amount,
			}));
			const expenseItems = match.expenseItems.map(
				({ id, label, amount, category }) => ({
					id,
					label,
					amount,
					category,
					categoryLabel: expenseLabels[category],
				}),
			);
			const totalIncome = sum(incomeItems);
			const totalExpense = sum(expenseItems);
			return {
				id: match.id,
				startsAt: match.startsAt,
				date: formatDate(match.startsAt),
				time: formatTime(match.startsAt),
				venue: match.venue,
				address: match.address || group.address,
				courtNumber: match.courtNumber,
				attendanceCount: match.attendanceIds.length,
				incomeItems,
				expenseItems,
				totalIncome,
				totalExpense,
				balance: totalIncome - totalExpense,
				...(match.notes ? { notes: match.notes } : {}),
			};
		});
	const totalIncome = sum(reportMatches.flatMap((match) => match.incomeItems));
	const totalExpense = sum(reportMatches.flatMap((match) => match.expenseItems));

	return {
		month,
		monthLabel,
		generatedAt: new Date().toISOString(),
		group,
		matches: reportMatches,
		totals: {
			totalIncome,
			totalExpense,
			balance: totalIncome - totalExpense,
		},
	};
};

export const buildMonthlyReportText = (snapshot: MonthlyReportSnapshot) => {
	const monthNumber = Number(snapshot.month.slice(5, 7));
	const year = snapshot.month.slice(0, 4);
	const lines = [`Tháng ${monthNumber}/${year}`, ""];

	if (!snapshot.matches.length) {
		lines.push("Chưa có dữ liệu buổi cầu trong tháng này.");
	} else {
		for (const match of snapshot.matches) {
			const income = match.incomeItems.map(lineDescription).join(" + ");
			const expenses = match.expenseItems
				.map(
					(item) =>
						`${formatCompactVnd(item.amount)} ${expenseDescription(item.label, item.category)}`,
				)
				.join(" + ");
			const incomePart = income ? `Thu: ${income}` : "Không có khoản thu";
			const expensePart = expenses ? `Chi: ${expenses}` : "Không có khoản chi";
			lines.push(
				`${formatDayMonth(match.startsAt)} · ${match.time} · ${match.venue} · ${incomePart} · ${expensePart}`,
			);
			if (match.notes) lines.push(`  Ghi chú: ${match.notes}`);
		}
	}

	lines.push(
		"",
		`TỔNG THU: ${formatVnd(snapshot.totals.totalIncome)}`,
		`TỔNG CHI: ${formatVnd(snapshot.totals.totalExpense)}`,
		`SỐ DƯ: ${formatVnd(snapshot.totals.balance)}`,
	);
	return lines.join("\n");
};

const downloadBlob = (
	content: string,
	filename: string,
	type: string,
	withBom = false,
) => {
	const blob = new Blob([withBom ? "﻿" : "", content], { type });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
};

export const buildGroupBackupSnapshot = ({
	members,
	matches,
	group,
}: {
	members: Member[];
	matches: Match[];
	group: GroupReportInfo;
}): GroupBackupSnapshot => ({
	version: 1,
	exportedAt: new Date().toISOString(),
	group,
	members: [...members].sort((a, b) => a.name.localeCompare(b.name, "vi")),
	matches: [...matches].sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
});

export const downloadGroupBackup = (snapshot: GroupBackupSnapshot) => {
	downloadBlob(
		JSON.stringify(snapshot, null, 2),
		`du-lieu-nhom-${new Date().toISOString().slice(0, 10)}.json`,
		"application/json;charset=utf-8",
	);
};

export const downloadMonthlyReport = (
	snapshot: MonthlyReportSnapshot,
	format: "txt" | "json",
) => {
	const safeMonth = snapshot.month.replace(/[^0-9-]/g, "-");
	const baseName = `hoa-don-${safeMonth}`;
	if (format === "txt") {
		downloadBlob(
			buildMonthlyReportText(snapshot),
			`${baseName}.txt`,
			"text/plain;charset=utf-8",
			true,
		);
		return;
	}
	downloadBlob(
		JSON.stringify(snapshot, null, 2),
		`${baseName}.json`,
		"application/json;charset=utf-8",
	);
};
