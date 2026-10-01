import { useEffect, useState } from "react";
import {
	ArrowRight,
	BarChart3,
	CalendarDays,
	Check,
	ChevronRight,
	CircleDollarSign,
	Clock3,
	Download,
	Droplets,
	Edit3,
	History,
	LogIn,
	LogOut,
	MapPin,
	Menu,
	Plus,
	ReceiptText,
	Save,
	ShieldCheck,
	Sparkles,
	Table2,
	Trash2,
	Trophy,
	UserPlus,
	Users,
	X,
	Zap,
} from "lucide-react";
import type {
	ExpenseCategory,
	ExpenseLine,
	FinanceLine,
	Match,
	MatchDraft,
	Member,
} from "./types";
import { GROUP_PROFILE, nextFriday } from "./data";
import {
	buildGroupBackupSnapshot,
	buildMonthlyReportSnapshot,
	downloadGroupBackup,
	downloadMonthlyReport,
} from "./reportExport";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import {
	addMemberRemote,
	archiveMemberRemote,
	deleteMatchRemote,
	getSession,
	isCurrentUserAdmin,
	loadSnapshot,
	restoreMemberRemote,
	saveMatchRemote,
	signIn,
	signOut,
} from "./repository";
const money = new Intl.NumberFormat("vi-VN", {
	style: "currency",
	currency: "VND",
	maximumFractionDigits: 0,
});
const compactMoney = new Intl.NumberFormat("vi-VN", {
	notation: "compact",
	maximumFractionDigits: 1,
});
const expenseLabels: Record<ExpenseCategory, string> = {
	court: "Tiền sân",
	water: "Nước",
	shuttlecock: "Cầu",
	other: "Khác",
};
const uid = () => Math.random().toString(36).slice(2, 10);
const errorMessage = (error: unknown, fallback: string) =>
	error instanceof Error
		? error.message
		: typeof error === "object" && error !== null && "message" in error
			? String(error.message)
			: fallback;
const sum = (items: { amount: number }[]) =>
	items.reduce((total, item) => total + (Number(item.amount) || 0), 0);
const incomeTotal = (match: Match) => sum(match.incomeItems);
const expenseTotal = (match: Match) => sum(match.expenseItems);
const balance = (match: Match) => incomeTotal(match) - expenseTotal(match);
const monthKey = (date: string) => date.slice(0, 7);
const monthLabel = (key: string) =>
	new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(
		new Date(`${key}-01T12:00:00`),
	);
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
const isToday = (date: string) =>
	new Date(date).toDateString() === new Date().toDateString();
const toInputDate = (date: string) => {
	const d = new Date(date);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromInputDate = (value: string) => new Date(value).toISOString();
const blankDraft = (): MatchDraft => ({
	startsAt: nextFriday().toISOString(),
	venue: GROUP_PROFILE.defaultVenue,
	address: GROUP_PROFILE.address,
	courtNumber: "",
	incomeItems: [{ id: uid(), label: "Đóng góp thành viên", amount: 0 }],
	expenseItems: [
		{ id: uid(), category: "court", label: "Tiền sân", amount: 0 },
	],
	attendanceIds: [],
	notes: "",
});

function App() {
	const [path, setPath] = useState(window.location.pathname);
	const [matches, setMatches] = useState<Match[]>([]);
	const [members, setMembers] = useState<Member[]>([]);
	const [authed, setAuthed] = useState(false);
	const [authReady, setAuthReady] = useState(!hasSupabaseConfig);
	const [dataLoading, setDataLoading] = useState(hasSupabaseConfig);
	const [dataError, setDataError] = useState("");
	const [mobileMenu, setMobileMenu] = useState(false);

	const refreshData = async (showLoading = false) => {
		if (showLoading) setDataLoading(true);
		try {
			const snapshot = await loadSnapshot();
			setMembers(snapshot.members);
			setMatches(snapshot.matches);
			setDataError("");
		} catch (error) {
			if (showLoading)
				setDataError(error instanceof Error ? error.message : "Không thể tải dữ liệu.");
		} finally {
			if (showLoading) setDataLoading(false);
		}
	};

	useEffect(() => {
		if (hasSupabaseConfig) void refreshData(true);
	}, []);
	useEffect(() => {
		if (!supabase) return;
		let active = true;
		const initializeAuth = async () => {
			try {
				const session = await getSession();
				if (session && (await isCurrentUserAdmin()) && active) setAuthed(true);
			} catch {
				if (active) setAuthed(false);
			} finally {
				if (active) setAuthReady(true);
			}
		};
		void initializeAuth();
		const { data } = supabase.auth.onAuthStateChange((_event, session) => {
			if (!session) setAuthed(false);
		});
		return () => {
			active = false;
			data.subscription.unsubscribe();
		};
	}, []);
	useEffect(() => {
		const client = supabase;
		if (!client) return;
		let timer: number | undefined;
		const refreshAfterChange = () => {
			window.clearTimeout(timer);
			timer = window.setTimeout(() => void refreshData(), 250);
		};
		const channel = client
			.channel("shared-group-data")
			.on("postgres_changes", { event: "*", schema: "public", table: "matches" }, refreshAfterChange)
			.on("postgres_changes", { event: "*", schema: "public", table: "members" }, refreshAfterChange)
			.subscribe();
		return () => {
			window.clearTimeout(timer);
			void client.removeChannel(channel);
		};
	}, []);
	useEffect(() => {
		const onPop = () => setPath(window.location.pathname);
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, []);
	const navigate = (next: string) => {
		window.history.pushState({}, "", next);
		setPath(next);
		setMobileMenu(false);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};
	const login = async (email: string, password: string) => {
		try {
			await signIn(email, password);
			if (!(await isCurrentUserAdmin())) {
				await signOut();
				return "Tài khoản này chưa được cấp quyền quản trị.";
			}
			setAuthed(true);
			navigate("/admin/overview");
			return "";
		} catch (error) {
			return error instanceof Error ? error.message : "Tài khoản hoặc mật khẩu chưa đúng.";
		}
	};
	const logout = async () => {
		try {
			await signOut();
		} finally {
			setAuthed(false);
			navigate("/");
		}
	};
	const saveMatch = async (draft: MatchDraft, id?: string) => {
		const cleanDraft = {
			...draft,
			attendanceIds: draft.attendanceIds.filter((memberId) =>
				members.some((member) => member.id === memberId),
			),
		};
		const saved = await saveMatchRemote(cleanDraft, id);
		setMatches((current) =>
			id
				? current.map((match) => (match.id === id ? saved : match))
				: [saved, ...current],
		);
	};
	const deleteMatch = async (id: string) => {
		await deleteMatchRemote(id);
		setMatches((current) => current.filter((match) => match.id !== id));
	};
	const addMember = async (name: string) => {
		const trimmed = name.trim();
		if (!trimmed) return "Vui lòng nhập tên thành viên.";
		if (
			members.some(
				(member) =>
					member.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
			)
		)
			return "Tên thành viên này đã tồn tại.";
		try {
			const member = await addMemberRemote(trimmed);
			setMembers((current) => [...current, member]);
			return "";
		} catch (error) {
			return error instanceof Error ? error.message : "Không thể thêm thành viên.";
		}
	};
	const removeMember = async (id: string) => {
		const member = await archiveMemberRemote(id);
		setMembers((current) => current.map((item) => (item.id === id ? member : item)));
	};
	const restoreMember = async (id: string) => {
		const member = await restoreMemberRemote(id);
		setMembers((current) => current.map((item) => (item.id === id ? member : item)));
	};

	if (!hasSupabaseConfig) return <SetupState />;
	if (!authReady || dataLoading) return <LoadingState />;
	if (dataError) return <ErrorState message={dataError} onRetry={refreshData} />;
	if (path.startsWith("/admin")) {
		if (path === "/admin/login" || !authed)
			return <LoginPage onLogin={login} onBack={() => navigate("/")} />;
		return (
			<AdminShell
				path={path}
				navigate={navigate}
				matches={matches}
				members={members}
				saveMatch={saveMatch}
				deleteMatch={deleteMatch}
				addMember={addMember}
				removeMember={removeMember}
				restoreMember={restoreMember}
				logout={logout}
			/>
		);
	}
	return (
		<PublicShell
			path={path}
			navigate={navigate}
			matches={matches}
			members={members}
			mobileMenu={mobileMenu}
			setMobileMenu={setMobileMenu}
		/>
	);
}

function SetupState() {
	return (
		<div className="system-state">
			<ShieldCheck size={28} />
			<h1>Cần cấu hình Supabase</h1>
			<p>
				Tạo file <code>.env.local</code> từ <code>.env.example</code>, điền URL và anon key
				của Supabase rồi khởi động lại ứng dụng.
			</p>
		</div>
	);
}

function LoadingState() {
	return (
		<div className="system-state">
			<Clock3 size={28} />
			<h1>Đang tải dữ liệu nhóm...</h1>
			<p>Dữ liệu được đọc từ Supabase dùng chung.</p>
		</div>
	);
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
	return (
		<div className="system-state">
			<X size={28} />
			<h1>Không thể tải dữ liệu</h1>
			<p>{message}</p>
			<button type="button" className="button button-primary" onClick={onRetry}>
				Thử lại
			</button>
		</div>
	);
}

function Logo({ compact = false }: { compact?: boolean }) {
	return (
		<div className="logo">
			<span className="logo-mark">
				<Zap size={compact ? 16 : 20} fill="currentColor" />
			</span>
			<span>
				Follow<span className="logo-dot">.</span>
			</span>
		</div>
	);
}

function PublicShell({
	path,
	navigate,
	matches,
	members,
	mobileMenu,
	setMobileMenu,
}: {
	path: string;
	navigate: (path: string) => void;
	matches: Match[];
	members: Member[];
	mobileMenu: boolean;
	setMobileMenu: (value: boolean) => void;
}) {
	return (
		<div className="app-shell public-shell">
			<header className="public-header">
				<div className="container header-inner">
					<button className="brand-button" onClick={() => navigate("/")}>
						<Logo />
					</button>
					<button
						className="mobile-menu-button"
						aria-label="Mở menu"
						onClick={() => setMobileMenu(!mobileMenu)}
					>
						{mobileMenu ? <X /> : <Menu />}
					</button>
					<nav className={`public-nav ${mobileMenu ? "is-open" : ""}`}>
						<button
							className={path === "/" ? "active" : ""}
							onClick={() => navigate("/")}
						>
							Tổng quan
						</button>
						<button
							className={path === "/history" ? "active" : ""}
							onClick={() => navigate("/history")}
						>
							Lịch sử trận
						</button>
						<button
							className="nav-admin"
							onClick={() => navigate("/admin/login")}
						>
							<ShieldCheck size={16} /> Quản trị
						</button>
					</nav>
				</div>
			</header>
			{path === "/history" ? (
				<HistoryPage matches={matches} members={members} />
			) : (
				<HomePage matches={matches} members={members} navigate={navigate} />
			)}
			<footer className="site-footer">
				<div className="container footer-inner">
					<Logo compact />
					<span>{GROUP_PROFILE.name}</span>
					<span className="footer-year">
						© {new Date().getFullYear()} · Nguyenquocvinh813@gmail.com
					</span>
				</div>
			</footer>
		</div>
	);
}

function HomePage({
	matches,
	members,
	navigate,
}: {
	matches: Match[];
	members: Member[];
	navigate: (path: string) => void;
}) {
	const upcoming = [...matches]
		.filter((m) => new Date(m.startsAt).getTime() >= Date.now())
		.sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
	const recent = [...matches]
		.filter((m) => m.id !== upcoming?.id)
		.sort((a, b) => b.startsAt.localeCompare(a.startsAt))
		.slice(0, 3);
	return (
		<main>
			<section className="hero-section" style={{ letterSpacing: 1 }}>
				<div className="hero-grid container">
					<div className="hero-copy">
						<div style={{ letterSpacing: 1 }} className="eyebrow">
							<span className="pulse-dot" /> {GROUP_PROFILE.name.toUpperCase()}{" "}
							· LỊCH LINH HOẠT
						</div>
						<h1 style={{ letterSpacing: 1 }}>
							Chơi hết mình.
							<br />
							<em style={{ letterSpacing: 1 }}>Ghi chép rõ ràng.</em>
						</h1>
						<p className="hero-lede">
							Lịch trận, tiền sân và từng khoản chi của {GROUP_PROFILE.name} —
							minh bạch để mọi buổi cầu tại PIXIHUB đều thật vui.
						</p>
						<div className="hero-actions">
							<button
								className="button button-primary"
								onClick={() =>
									document
										.getElementById("next-match")
										?.scrollIntoView({ behavior: "smooth" })
								}
							>
								Xem trận sắp tới <ArrowRight size={17} />
							</button>
							<button
								className="text-button"
								onClick={() => navigate("/history")}
							>
								Xem lịch sử <ChevronRight size={16} />
							</button>
						</div>
						<div className="hero-proof">
							<div className="avatar-stack">
								<span>10</span>
								<span>F</span>
								<span>VR</span>
								<span>
									+
									{Math.max(
										0,
										members.filter((member) => member.active).length - 3,
									)}
								</span>
							</div>
							<span>
								{members.filter((member) => member.active).length} thành viên
								trong nhóm
							</span>
						</div>
					</div>
					<div className="hero-art" aria-hidden="true">
						<div className="court-lines">
							<span className="court-net" />
							<span className="court-circle" />
							<span className="court-line line-one" />
							<span className="court-line line-two" />
						</div>
						<div className="floating-score">
							<span className="score-label">SÂN CỐ ĐỊNH</span>
							<strong>PIXIHUB</strong>
							<small>10 Bế Văn Cấm, Tân Hưng</small>
						</div>
						<div className="shuttle-orb">◒</div>
					</div>
				</div>
			</section>
			<section id="next-match" className="section container">
				<div className="section-heading">
					<div>
						<p className="eyebrow">LỊCH ĐÁNH · LỊCH LINH HOẠT</p>
						<h2>Trận cầu sắp tới</h2>
					</div>
					<span className="section-note">
						<Clock3 size={15} /> Cập nhật theo thời gian thực
					</span>
				</div>
				{upcoming ? (
					<NextMatchCard match={upcoming} members={members} />
				) : (
					<EmptyState text="Chưa có lịch trận sắp tới. Admin hãy nhập buổi cầu đầu tiên." />
				)}
			</section>
			<section className="section section-tint">
				<div className="container">
					<div className="section-heading">
						<div>
							<p className="eyebrow">MINH BẠCH TỪNG KHOẢN</p>
							<h2>Chi phí của một buổi cầu</h2>
						</div>
						<button
							className="text-button"
							onClick={() => navigate("/history")}
						>
							Tất cả trận đã đánh <ChevronRight size={16} />
						</button>
					</div>
					{upcoming ? (
						<FinanceSnapshot match={upcoming} />
					) : (
						<div className="address-card">
							<MapPin size={19} />
							<div>
								<strong>{GROUP_PROFILE.defaultVenue}</strong>
								<span>{GROUP_PROFILE.address} · Có thể sắp lịch vào ngày phù hợp</span>
							</div>
						</div>
					)}
				</div>
			</section>
			<section className="section container">
				<div className="section-heading">
					<div>
						<p className="eyebrow">NHẬT KÝ NHÓM</p>
						<h2>Những buổi cầu đã qua</h2>
					</div>
					<button className="text-button" onClick={() => navigate("/history")}>
						Mở lịch sử đầy đủ <ArrowRight size={16} />
					</button>
				</div>
				{recent.length ? (
					<div className="recent-grid">
						{recent.map((match) => (
							<MatchCard key={match.id} match={match} members={members} />
						))}
					</div>
				) : (
					<EmptyState text="Lịch sử sẽ xuất hiện sau khi admin nhập buổi cầu đầu tiên." />
				)}
			</section>
			<section className="cta-section container">
				<div>
					<span className="cta-icon">
						<Sparkles size={20} />
					</span>
					<h2>
						Mọi người cùng xem,
						<br />
						<em>không ai phải đoán.</em>
					</h2>
					<p>{GROUP_PROFILE.address} · Sân cầu lông PIXIHUB · Lịch linh hoạt</p>
				</div>
				<button
					className="button button-dark"
					onClick={() => navigate("/history")}
				>
					Xem bảng thu chi <ArrowRight size={17} />
				</button>
			</section>
		</main>
	);
}

function NextMatchCard({
	match,
	members,
}: {
	match: Match;
	members: Member[];
}) {
	return (
		<article className="next-match-card">
			<div className="next-match-main">
				<div className="match-status">
					<span className="status-dot" />{" "}
					{isToday(match.startsAt) ? "HÔM NAY" : "TRẬN TIẾP THEO"}
				</div>
				<h3>{formatDate(match.startsAt)}</h3>
				<div className="next-time">
					{formatTime(match.startsAt)} <span>·</span> {match.venue}
				</div>
				<div className="address-line">
					<MapPin size={14} /> {match.address || GROUP_PROFILE.address}
				</div>
				<div className="match-meta">
					<span>
						<MapPin size={16} /> {match.courtNumber}
					</span>
					<span>
						<Users size={16} /> {match.attendanceIds.length}/
						{members.filter((member) => member.active).length} có mặt
					</span>
				</div>
			</div>
			<div className="next-match-cost">
				<span className="cost-label">DỰ KIẾN TỔNG CHI</span>
				<strong>{money.format(expenseTotal(match))}</strong>
				<span className="cost-sub">
					{match.expenseItems.length} khoản chi đã dự trù
				</span>
			</div>
			<div className="match-stamp">
				{formatTime(match.startsAt)}
				<small>{match.courtNumber}</small>
			</div>
		</article>
	);
}
function FinanceSnapshot({ match }: { match: Match }) {
	const categories = (
		["court", "water", "shuttlecock", "other"] as ExpenseCategory[]
	)
		.map((category) => ({
			category,
			amount: sum(
				match.expenseItems.filter((item) => item.category === category),
			),
		}))
		.filter((item) => item.amount > 0);
	return (
		<div className="finance-layout">
			<div className="finance-total-card">
				<div className="total-card-top">
					<span>
						<CircleDollarSign size={18} /> BUỔI CẦU NÀY
					</span>
					<span className="mini-chip">
						{formatDate(match.startsAt).split(",")[0]}
					</span>
				</div>
				<strong>{money.format(expenseTotal(match))}</strong>
				<p>Tổng chi dự kiến · {match.venue}</p>
				<div className="balance-row">
					<span>Tổng thu</span>
					<strong>{money.format(incomeTotal(match))}</strong>
					<span className={balance(match) >= 0 ? "positive" : "negative"}>
						{balance(match) >= 0 ? "Dư quỹ" : "Cần bổ sung"}{" "}
						{money.format(Math.abs(balance(match)))}
					</span>
				</div>
			</div>
			<div className="expense-list">
				{categories.map((item) => (
					<div className="expense-row" key={item.category}>
						<span className={`expense-icon ${item.category}`}>
							{item.category === "water" ? (
								<Droplets size={17} />
							) : item.category === "court" ? (
								<MapPin size={17} />
							) : item.category === "shuttlecock" ? (
								<Trophy size={17} />
							) : (
								<ReceiptText size={17} />
							)}
						</span>
						<span className="expense-name">
							{expenseLabels[item.category]}
							<small>
								{match.expenseItems
									.filter((expense) => expense.category === item.category)
									.map((expense) => expense.label)
									.join(" · ")}
							</small>
						</span>
						<strong>{money.format(item.amount)}</strong>
						<div className="expense-bar">
							<span
								style={{
									width: `${Math.min(100, (item.amount / Math.max(...categories.map((c) => c.amount))) * 100)}%`,
								}}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
function MatchCard({
	match,
	members,
	onClick,
}: {
	match: Match;
	members: Member[];
	onClick?: () => void;
}) {
	return (
		<article
			className={`match-card ${onClick ? "is-clickable" : ""}`}
			onClick={onClick}
			onKeyDown={(event) => event.key === "Enter" && onClick?.()}
			tabIndex={onClick ? 0 : undefined}
		>
			<div className="card-date">
				<strong>{new Date(match.startsAt).getDate()}</strong>
				<span>
					{new Intl.DateTimeFormat("vi-VN", { month: "short" })
						.format(new Date(match.startsAt))
						.replace(".", "")}
				</span>
			</div>
			<div className="card-info">
				<span className="card-kicker">
					{formatTime(match.startsAt)} · {match.courtNumber}
				</span>
				<h3>{match.venue}</h3>
				<span className="card-detail">
					<ReceiptText size={14} /> {match.expenseItems.length} khoản chi ·{" "}
					{match.attendanceIds.length}/
					{members.filter((member) => member.active).length} có mặt
				</span>
			</div>
			<ChevronRight className="card-arrow" size={19} />
		</article>
	);
}
function HistoryPage({
	matches,
	members,
}: {
	matches: Match[];
	members: Member[];
}) {
	const [month, setMonth] = useState("all");
	const [venue, setVenue] = useState("all");
	const [selected, setSelected] = useState<Match | null>(null);
	const months = [...new Set(matches.map((m) => monthKey(m.startsAt)))]
		.sort()
		.reverse();
	const venues = [...new Set(matches.map((m) => m.venue))];
	const filtered = matches
		.filter(
			(m) =>
				(month === "all" || monthKey(m.startsAt) === month) &&
				(venue === "all" || m.venue === venue),
		)
		.sort((a, b) => b.startsAt.localeCompare(a.startsAt));
	return (
		<main className="history-page">
			<section className="page-hero">
				<div className="container page-hero-inner">
					<div>
						<div className="eyebrow">NHẬT KÝ NHÓM</div>
						<h1>Lịch sử trận cầu</h1>
						<p>
							{GROUP_PROFILE.name} · Lịch linh hoạt · {GROUP_PROFILE.defaultVenue}
						</p>
					</div>
					<div className="history-stat">
						<strong>{matches.length}</strong>
						<span>buổi đã lưu</span>
					</div>
				</div>
			</section>
			<section className="section container">
				<div className="filter-bar">
					<div className="filter-title">
						<History size={18} /> Lọc lịch sử
					</div>
					<label>
						Tháng
						<select value={month} onChange={(e) => setMonth(e.target.value)}>
							<option value="all">Tất cả các tháng</option>
							{months.map((key) => (
								<option key={key} value={key}>
									{monthLabel(key)}
								</option>
							))}
						</select>
					</label>
					<label>
						Sân
						<select value={venue} onChange={(e) => setVenue(e.target.value)}>
							<option value="all">Tất cả sân</option>
							{venues.map((item) => (
								<option key={item} value={item}>
									{item}
								</option>
							))}
						</select>
					</label>
					<span className="filter-result">{filtered.length} kết quả</span>
				</div>
				{filtered.length ? (
					<div className="history-grid">
						{filtered.map((match) => (
							<MatchCard
								key={match.id}
								match={match}
								members={members}
								onClick={() => setSelected(match)}
							/>
						))}
					</div>
				) : (
					<EmptyState text="Chưa có trận đấu nào trong khoảng lọc này." />
				)}
			</section>
			{selected ? (
				<MatchDetail
					match={selected}
					members={members}
					onClose={() => setSelected(null)}
				/>
			) : null}
		</main>
	);
}
function MatchDetail({
	match,
	members,
	onClose,
}: {
	match: Match;
	members: Member[];
	onClose: () => void;
}) {
	return (
		<div
			className="modal-backdrop"
			role="presentation"
			onMouseDown={(event) => event.target === event.currentTarget && onClose()}
		>
			<section
				className="detail-modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="detail-title"
			>
				<button className="modal-close" onClick={onClose} aria-label="Đóng">
					<X size={19} />
				</button>
				<div className="eyebrow">CHI TIẾT BUỔI CẦU</div>
				<h2 id="detail-title">{match.venue}</h2>
				<p className="detail-date">
					<CalendarDays size={16} /> {formatDate(match.startsAt)} ·{" "}
					{formatTime(match.startsAt)} · {match.courtNumber}
				</p>
				<p className="address-line">
					<MapPin size={14} /> {match.address || GROUP_PROFILE.address} ·{" "}
					{match.attendanceIds.length}/
					{members.filter((member) => member.active).length} thành viên có mặt
				</p>
				<div className="detail-total">
					<span>Tổng chi</span>
					<strong>{money.format(expenseTotal(match))}</strong>
					<span className={balance(match) >= 0 ? "positive" : "negative"}>
						{balance(match) >= 0 ? "Dư quỹ" : "Thiếu quỹ"}{" "}
						{money.format(Math.abs(balance(match)))}
					</span>
				</div>
				<div className="detail-columns">
					<div>
						<h3>Khoản thu</h3>
						{match.incomeItems.map((item) => (
							<div className="line-item" key={item.id}>
								<span>{item.label}</span>
								<strong>{money.format(item.amount)}</strong>
							</div>
						))}
					</div>
					<div>
						<h3>Khoản chi</h3>
						{match.expenseItems.map((item) => (
							<div className="line-item" key={item.id}>
								<span>
									{expenseLabels[item.category]}
									<small>{item.label}</small>
								</span>
								<strong>{money.format(item.amount)}</strong>
							</div>
						))}
					</div>
				</div>
				{match.notes ? (
					<div className="detail-note">
						<span>Ghi chú</span>
						<p>{match.notes}</p>
					</div>
				) : null}
			</section>
		</div>
	);
}

function AdminShell({
	path,
	navigate,
	matches,
	members,
	saveMatch,
	deleteMatch,
	addMember,
	removeMember,
	restoreMember,
	logout,
}: {
	path: string;
	navigate: (path: string) => void;
	matches: Match[];
	members: Member[];
	saveMatch: (draft: MatchDraft, id?: string) => Promise<void>;
	deleteMatch: (id: string) => Promise<void>;
	addMember: (name: string) => Promise<string>;
	removeMember: (id: string) => Promise<void>;
	restoreMember: (id: string) => Promise<void>;
	logout: () => Promise<void>;
}) {
	const section = path.includes("matches")
		? "matches"
		: path.includes("reports")
			? "reports"
			: path.includes("members")
				? "members"
				: "overview";
	return (
		<div className="admin-shell">
			<aside className="admin-sidebar">
				<div className="admin-brand">
					<Logo />
					<span className="admin-label">
						{GROUP_PROFILE.name.toUpperCase()}
					</span>
				</div>
				<nav>
					<button
						className={section === "overview" ? "active" : ""}
						onClick={() => navigate("/admin/overview")}
					>
						<BarChart3 size={18} /> Tổng quan
					</button>
					<button
						className={section === "matches" ? "active" : ""}
						onClick={() => navigate("/admin/matches")}
					>
						<CalendarDays size={18} /> Quản lý trận
					</button>
					<button
						className={section === "members" ? "active" : ""}
						onClick={() => navigate("/admin/members")}
					>
						<Users size={18} /> Thành viên
					</button>
					<button
						className={section === "reports" ? "active" : ""}
						onClick={() => navigate("/admin/reports")}
					>
						<Table2 size={18} /> Báo cáo tháng
					</button>
				</nav>
				<div className="sidebar-bottom">
					<button onClick={() => navigate("/")}>
						<ArrowRight size={16} /> Về trang thành viên
					</button>
					<button className="logout-link" onClick={logout}>
						<LogOut size={16} /> Đăng xuất
					</button>
				</div>
			</aside>
			<main className="admin-main">
				<header className="admin-topbar">
					<div>
						<span className="admin-mobile-logo">
							<Logo compact />
						</span>
						<span className="admin-breadcrumb">
							{GROUP_PROFILE.name} /{" "}
							<strong>
								{section === "overview"
									? "Tổng quan"
									: section === "matches"
										? "Quản lý trận"
										: section === "members"
											? "Thành viên"
											: "Báo cáo tháng"}
							</strong>
						</span>
					</div>
					<div className="admin-user">
						<span className="admin-avatar">A</span>
						<span>Admin</span>
						<span className="online-dot" />
					</div>
				</header>
				{section === "overview" ? (
					<AdminOverview
						matches={matches}
						members={members}
						navigate={navigate}
					/>
				) : section === "matches" ? (
					<AdminMatches
						matches={matches}
						members={members}
						saveMatch={saveMatch}
						deleteMatch={deleteMatch}
					/>
				) : section === "members" ? (
					<AdminMembers
						members={members}
						addMember={addMember}
						removeMember={removeMember}
						restoreMember={restoreMember}
					/>
				) : (
					<AdminReports matches={matches} members={members} />
				)}
			</main>
		</div>
	);
}
function KpiCard({
	label,
	value,
	note,
	icon: Icon,
	tone,
}: {
	label: string;
	value: string;
	note: string;
	icon: typeof BarChart3;
	tone: string;
}) {
	return (
		<div className={`kpi-card ${tone}`}>
			<div className="kpi-icon">
				<Icon size={18} />
			</div>
			<span>{label}</span>
			<strong>{value}</strong>
			<small>{note}</small>
		</div>
	);
}
function AdminOverview({
	matches,
	members,
	navigate,
}: {
	matches: Match[];
	members: Member[];
	navigate: (path: string) => void;
}) {
	const current = monthKey(new Date().toISOString());
	const currentMatches = matches.filter(
		(m) => monthKey(m.startsAt) === current,
	);
	const totalIn = sum(currentMatches.flatMap((m) => m.incomeItems));
	const totalOut = sum(currentMatches.flatMap((m) => m.expenseItems));
	const next = matches
		.filter((m) => new Date(m.startsAt) >= new Date())
		.sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
	return (
		<div className="admin-content">
			<div className="admin-heading">
				<div>
					<span className="eyebrow">{GROUP_PROFILE.name.toUpperCase()}</span>
					<h1>Tổng quan nhóm</h1>
					<p>
						{GROUP_PROFILE.defaultVenue} · Lịch linh hoạt · {GROUP_PROFILE.address}
					</p>
				</div>
				<button
					className="button button-primary"
					onClick={() => navigate("/admin/matches")}
				>
					<Plus size={17} /> Thêm trận đấu
				</button>
			</div>
			<div className="kpi-grid">
				<KpiCard
					label="Số trận tháng này"
					value={String(currentMatches.length)}
					note="buổi đã ghi nhận"
					icon={CalendarDays}
					tone="blue"
				/>
				<KpiCard
					label="Tổng thu"
					value={money.format(totalIn)}
					note="đóng góp & quỹ nhóm"
					icon={CircleDollarSign}
					tone="green"
				/>
				<KpiCard
					label="Tổng chi"
					value={money.format(totalOut)}
					note="tất cả khoản chi"
					icon={ReceiptText}
					tone="orange"
				/>
				<KpiCard
					label="Thành viên hoạt động"
					value={String(members.filter((member) => member.active).length)}
					note="có thể điểm danh"
					icon={Users}
					tone="purple"
				/>
			</div>
			<div className="admin-two-col">
				<section className="admin-panel next-admin-panel">
					<div className="panel-heading">
						<div>
							<span className="eyebrow">SẮP DIỄN RA</span>
							<h2>Trận tiếp theo</h2>
						</div>
						<button
							className="icon-button"
							onClick={() => navigate("/admin/matches")}
							aria-label="Xem quản lý trận"
						>
							<ChevronRight size={18} />
						</button>
					</div>
					{next ? (
						<NextMatchCard match={next} members={members} />
					) : (
						<EmptyState text="Chưa có trận sắp tới." />
					)}
				</section>
				<section className="admin-panel">
					<div className="panel-heading">
						<div>
							<span className="eyebrow">HOẠT ĐỘNG GẦN ĐÂY</span>
							<h2>Nhật ký cập nhật</h2>
						</div>
					</div>
					{matches.length ? (
						<div className="activity-list">
							{matches.slice(0, 4).map((match) => (
								<div className="activity-row" key={match.id}>
									<span className="activity-icon">
										<Check size={15} />
									</span>
									<div>
										<strong>{match.venue}</strong>
										<span>
											{formatDate(match.startsAt)} ·{" "}
											{match.attendanceIds.length}/
											{members.filter((member) => member.active).length} có mặt
										</span>
									</div>
									<span className="activity-date">Đã ghi</span>
								</div>
							))}
						</div>
					) : (
						<EmptyState text="Chưa có dữ liệu trận đấu." />
					)}
					<button
						className="panel-link"
						onClick={() => navigate("/admin/reports")}
					>
						Xem báo cáo chi tiết <ArrowRight size={15} />
					</button>
				</section>
			</div>
		</div>
	);
}

function AdminMatches({
	matches,
	members,
	saveMatch,
	deleteMatch,
}: {
	matches: Match[];
	members: Member[];
	saveMatch: (draft: MatchDraft, id?: string) => Promise<void>;
	deleteMatch: (id: string) => Promise<void>;
}) {
	const [editing, setEditing] = useState<Match | "new" | null>(null);
	const [query, setQuery] = useState("");
	const [actionError, setActionError] = useState("");
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const handleDelete = async (id: string) => {
		setDeletingId(id);
		setActionError("");
		try {
			await deleteMatch(id);
		} catch (error) {
			setActionError(errorMessage(error, "Không thể xóa buổi cầu."));
		} finally {
			setDeletingId(null);
		}
	};
	const filtered = matches
		.filter((match) =>
			`${match.venue} ${match.courtNumber}`
				.toLowerCase()
				.includes(query.toLowerCase()),
		)
		.sort((a, b) => b.startsAt.localeCompare(a.startsAt));
	return (
		<div className="admin-content">
			<div className="admin-heading">
				<div>
					<span className="eyebrow">DỮ LIỆU BUỔI CẦU</span>
					<h1>Quản lý trận đấu</h1>
					<p>
						{GROUP_PROFILE.defaultVenue} · {GROUP_PROFILE.address} · Lịch linh hoạt
						vào ngày phù hợp.
					</p>
				</div>
				<button
					type="button"
					className="button button-primary"
					onClick={() => setEditing("new")}
				>
					<Plus size={17} /> Thêm trận đấu
				</button>
			</div>
			<div className="admin-toolbar">
				<label className="search-field">
					<span>⌕</span>
					<input
						placeholder="Tìm theo tên sân hoặc số sân..."
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</label>
				<span className="schedule-hint">
					<CalendarDays size={14} /> Có thể chọn mọi ngày
				</span>
			</div>
			{actionError ? <div className="form-error">{actionError}</div> : null}
			<section className="admin-panel match-table-panel">
				<div className="table-head">
					<span>{filtered.length} trận đấu</span>
					<span className="table-hint">Nhấn sửa để cập nhật thông tin</span>
				</div>
				<div className="match-table">
					{filtered.length ? (
						filtered.map((match) => (
							<div className="match-table-row" key={match.id}>
								<div className="table-date">
									<strong>{new Date(match.startsAt).getDate()}</strong>
									<span>
										{new Intl.DateTimeFormat("vi-VN", { month: "short" })
											.format(new Date(match.startsAt))
											.replace(".", "")}
									</span>
								</div>
								<div className="table-main">
									<strong>{match.venue}</strong>
									<span>
										{formatDate(match.startsAt)} · {formatTime(match.startsAt)}{" "}
										· {match.courtNumber}
									</span>
									<small className="attendance-count">
										<Users size={12} /> {match.attendanceIds.length}/
										{members.filter((member) => member.active).length} có mặt
									</small>
								</div>
								<div className="table-amount">
									<span>Thu / Chi</span>
									<strong>
										{money.format(incomeTotal(match))} <i>/</i>{" "}
										{money.format(expenseTotal(match))}
									</strong>
								</div>
								<div className="row-actions">
									<button
										type="button"
										className="icon-button"
										onClick={() => setEditing(match)}
										aria-label="Sửa trận"
									>
										<Edit3 size={16} />
									</button>
									<button
										type="button"
										className="icon-button danger"
										disabled={deletingId === match.id}
										onClick={() => {
											if (confirm("Xóa buổi cầu này khỏi sổ nhóm?"))
												void handleDelete(match.id);
										}}
										aria-label="Xóa trận"
									>
										<Trash2 size={16} />
									</button>
								</div>
							</div>
						))
					) : (
						<EmptyState text="Chưa có trận nào. Hãy thêm buổi cầu đầu tiên." />
					)}
				</div>
			</section>
			{editing ? (
				<MatchEditor
					match={editing === "new" ? null : editing}
					members={members}
					onClose={() => setEditing(null)}
					onSave={async (draft, id) => {
						await saveMatch(draft, id);
						setEditing(null);
					}}
				/>
			) : null}
		</div>
	);
}

function MatchEditor({
	match,
	members,
	onClose,
	onSave,
}: {
	match: Match | null;
	members: Member[];
	onClose: () => void;
	onSave: (draft: MatchDraft, id?: string) => Promise<void>;
}) {
	const [draft, setDraft] = useState<MatchDraft>(() =>
		match
			? {
					startsAt: match.startsAt,
					venue: match.venue,
					address: match.address || GROUP_PROFILE.address,
					courtNumber: match.courtNumber,
					incomeItems: match.incomeItems,
					expenseItems: match.expenseItems,
					attendanceIds: match.attendanceIds || [],
					notes: match.notes || "",
				}
			: blankDraft(),
	);
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);
	const update = <K extends keyof MatchDraft>(key: K, value: MatchDraft[K]) =>
		setDraft((current) => ({ ...current, [key]: value }));
	const addIncome = () =>
		update("incomeItems", [
			...draft.incomeItems,
			{ id: uid(), label: "", amount: 0 },
		]);
	const addExpense = () =>
		update("expenseItems", [
			...draft.expenseItems,
			{ id: uid(), category: "other", label: "", amount: 0 },
		]);
	const submit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!draft.startsAt) {
			setError("Vui lòng chọn ngày và giờ cho buổi cầu.");
			return;
		}
		if (
			!draft.venue.trim() ||
			!draft.address.trim() ||
			!draft.courtNumber.trim()
		) {
			setError("Vui lòng điền tên sân, địa chỉ và số sân.");
			return;
		}
		if (
			[...draft.incomeItems, ...draft.expenseItems].some(
				(item) => item.amount < 0 || Number.isNaN(Number(item.amount)),
			)
		) {
			setError("Số tiền không được âm hoặc không hợp lệ.");
			return;
		}
		if (!draft.expenseItems.some((item) => item.amount > 0)) {
			setError("Hãy nhập ít nhất một khoản chi.");
			return;
		}
		setError("");
		if (saving) return;
		setSaving(true);
		try {
		await onSave(
			{
				...draft,
				venue: draft.venue.trim(),
				address: draft.address.trim(),
				courtNumber: draft.courtNumber.trim(),
				incomeItems: draft.incomeItems.filter(
					(item) => item.label.trim() || item.amount > 0,
				),
				expenseItems: draft.expenseItems
					.filter((item) => item.label.trim() || item.amount > 0)
					.map((item) => ({
						...item,
						label: item.label.trim() || expenseLabels[item.category],
					})),
			},
			match?.id,
		);
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : "Không thể lưu buổi cầu.");
		} finally {
			setSaving(false);
		}
	};
	const attendanceMembers = members.filter(
		(member) => member.active || draft.attendanceIds.includes(member.id),
	);
	return (
		<div className="modal-backdrop" role="presentation">
			<section
				className="editor-modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="editor-title"
			>
				<div className="editor-header">
					<div>
						<span className="eyebrow">{match ? "CHỈNH SỬA" : "TẠO MỚI"}</span>
						<h2 id="editor-title">
							{match ? "Cập nhật buổi cầu" : "Thêm trận đấu"}
						</h2>
					</div>
					<button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">
						<X size={19} />
					</button>
				</div>
				<form onSubmit={submit}>
					<div className="form-grid">
						<label>
							Ngày & giờ
							<input
								type="datetime-local"
								value={toInputDate(draft.startsAt)}
								onChange={(e) =>
									update("startsAt", fromInputDate(e.target.value))
								}
							/>
						</label>
						<label>
							Tên sân
							<input
								placeholder={GROUP_PROFILE.defaultVenue}
								value={draft.venue}
								onChange={(e) => update("venue", e.target.value)}
							/>
						</label>
						<label>
							Số sân
							<input
								placeholder="VD: Sân 04"
								value={draft.courtNumber}
								onChange={(e) => update("courtNumber", e.target.value)}
							/>
						</label>
					</div>
					<label>
						Địa chỉ sân
						<input
							value={draft.address}
							onChange={(e) => update("address", e.target.value)}
						/>
					</label>
					<div className="attendance-editor">
						<div className="editor-section-heading">
							<div>
								<h3>Điểm danh buổi này</h3>
								<small className="field-help">
									{draft.attendanceIds.length}/
									{members.filter((member) => member.active).length} thành viên
									đang có mặt
								</small>
							</div>
							<Users size={18} />
						</div>
						<div className="attendance-grid">
							{attendanceMembers.map((member) => (
								<label
									className={`attendance-option ${member.active ? "" : "is-archived"}`}
									key={member.id}
								>
									<input
										type="checkbox"
										checked={draft.attendanceIds.includes(member.id)}
										onChange={(event) =>
											update(
												"attendanceIds",
												event.target.checked
													? [...draft.attendanceIds, member.id]
													: draft.attendanceIds.filter(
															(id) => id !== member.id,
														),
											)
										}
									/>
									<span>{member.name}</span>
									{!member.active ? <small>đã rời nhóm</small> : null}
								</label>
							))}
						</div>
					</div>
					<FinanceEditor
						title="Khoản thu"
						items={draft.incomeItems}
						onChange={(items) => update("incomeItems", items)}
						onAdd={addIncome}
						income
					/>
					<FinanceEditor
						title="Khoản chi"
						items={draft.expenseItems}
						onChange={(items) => update("expenseItems", items)}
						onAdd={addExpense}
					/>
					<label>
						Ghi chú
						<textarea
							rows={3}
							placeholder="Thêm ghi chú cho nhóm..."
							value={draft.notes}
							onChange={(e) => update("notes", e.target.value)}
						/>
					</label>
					{error ? <div className="form-error">{error}</div> : null}
					<div className="editor-actions">
						<button type="button" className="subtle-button" onClick={onClose}>
							Hủy
						</button>
						<button type="submit" className="button button-primary" disabled={saving}>
							<Save size={16} /> {saving ? "Đang lưu..." : "Lưu buổi cầu"}
						</button>
					</div>
				</form>
			</section>
		</div>
	);
}
function FinanceEditor<T extends FinanceLine | ExpenseLine>({
	title,
	items,
	onChange,
	onAdd,
	income = false,
}: {
	title: string;
	items: T[];
	onChange: (items: T[]) => void;
	onAdd: () => void;
	income?: boolean;
}) {
	return (
		<div className="finance-editor">
			<div className="editor-section-heading">
				<h3>{title}</h3>
				<button type="button" className="add-row-button" onClick={onAdd}>
					<Plus size={14} /> Thêm dòng
				</button>
			</div>
			{items.map((item, index) => (
				<div className="finance-input-row" key={item.id}>
					<input
						placeholder={income ? "VD: Đóng góp thành viên" : "Tên khoản chi"}
						value={item.label}
						onChange={(e) =>
							onChange(
								items.map((current, i) =>
									i === index ? { ...current, label: e.target.value } : current,
								),
							)
						}
					/>
					{!income && (
						<select
							value={(item as ExpenseLine).category}
							onChange={(e) =>
								onChange(
									items.map((current, i) =>
										i === index
											? {
													...current,
													category: e.target.value as ExpenseCategory,
												}
											: current,
									),
								)
							}
						>
							{Object.entries(expenseLabels).map(([key, label]) => (
								<option key={key} value={key}>
									{label}
								</option>
							))}
						</select>
					)}
					<input
						className="amount-input"
						type="number"
						min="0"
						step="1000"
						placeholder="0"
						value={item.amount || ""}
						onChange={(e) =>
							onChange(
								items.map((current, i) =>
									i === index
										? { ...current, amount: Number(e.target.value) }
										: current,
								),
							)
						}
					/>
					<button
						type="button"
						className="remove-row"
						onClick={() => onChange(items.filter((_, i) => i !== index))}
						aria-label="Xóa dòng"
					>
						<X size={15} />
					</button>
				</div>
			))}
		</div>
	);
}

function AdminMembers({
	members,
	addMember,
	removeMember,
	restoreMember,
}: {
	members: Member[];
	addMember: (name: string) => Promise<string>;
	removeMember: (id: string) => Promise<void>;
	restoreMember: (id: string) => Promise<void>;
}) {
	const [name, setName] = useState("");
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);
	const active = members.filter((member) => member.active);
	const archived = members.filter((member) => !member.active);
	const submit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (saving) return;
		setSaving(true);
		try {
		const result = await addMember(name);
		if (result) setError(result);
		else {
			setName("");
			setError("");
		}
		} finally {
			setSaving(false);
		}
	};
	return (
		<div className="admin-content">
			<div className="admin-heading">
				<div>
					<span className="eyebrow">DANH SÁCH NHÓM</span>
					<h1>Quản lý thành viên</h1>
					<p>Điểm danh nhanh cho từng buổi cầu và giữ roster luôn cập nhật.</p>
				</div>
				<span className="member-total">
					<Users size={16} /> {active.length} thành viên hoạt động
				</span>
			</div>
			<section className="admin-panel member-panel">
				<form className="member-add-form" onSubmit={submit}>
					<label>
						<span>Thêm thành viên</span>
						<input
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="Nhập họ và tên..."
						/>
					</label>
					<button className="button button-primary" type="submit" disabled={saving}>
						<UserPlus size={16} /> {saving ? "Đang thêm..." : "Thêm người"}
					</button>
				</form>
				{error ? <div className="form-error">{error}</div> : null}
				<div className="member-list">
					{active.map((member, index) => (
						<div className="member-row" key={member.id}>
							<span className="member-number">
								{String(index + 1).padStart(2, "0")}
							</span>
							<span className="member-name">{member.name}</span>
							<span className="active-badge">Đang hoạt động</span>
							<button
							type="button"
								className="remove-member"
								onClick={() => {
									if (confirm(`Xóa ${member.name} khỏi danh sách hoạt động?`))
										removeMember(member.id);
								}}
								aria-label={`Xóa ${member.name}`}
							>
								<Trash2 size={15} />
							</button>
						</div>
					))}
				</div>
			</section>
			{archived.length ? (
				<section className="admin-panel archived-panel">
					<div className="panel-heading">
						<div>
							<span className="eyebrow">LƯU LỊCH SỬ</span>
							<h2>Thành viên đã rời nhóm</h2>
						</div>
					</div>
					<div className="member-list">
						{archived.map((member) => (
							<div className="member-row archived-row" key={member.id}>
								<span className="member-number">—</span>
								<span className="member-name">{member.name}</span>
								<span className="archived-badge">Đã lưu lịch sử</span>
								<button
									type="button"
									className="subtle-button"
									onClick={() => restoreMember(member.id)}
								>
									Khôi phục
								</button>
							</div>
						))}
					</div>
				</section>
			) : null}
		</div>
	);
}
function AdminReports({ matches, members }: { matches: Match[]; members: Member[] }) {
	const months = [...new Set(matches.map((m) => monthKey(m.startsAt)))]
		.sort()
		.reverse();
	const [selectedMonth, setSelectedMonth] = useState(
		months[0] || monthKey(new Date().toISOString()),
	);
	const selected = matches.filter(
		(m) => monthKey(m.startsAt) === selectedMonth,
	);
	const income = sum(selected.flatMap((m) => m.incomeItems));
	const expense = sum(selected.flatMap((m) => m.expenseItems));
	const categories = (
		["court", "water", "shuttlecock", "other"] as ExpenseCategory[]
	)
		.map((category) => ({
			category,
			amount: sum(
				selected.flatMap((m) =>
					m.expenseItems.filter((item) => item.category === category),
				),
			),
		}))
		.filter((item) => item.amount > 0);
	const max = Math.max(income, expense, 1);
	const exportBackup = () => {
		downloadGroupBackup(
			buildGroupBackupSnapshot({
				members,
				matches,
				group: {
					name: GROUP_PROFILE.name,
					address: GROUP_PROFILE.address,
					defaultVenue: GROUP_PROFILE.defaultVenue,
				},
			}),
		);
	};
	const exportReport = (format: "txt" | "json") => {
		const snapshot = buildMonthlyReportSnapshot({
			month: selectedMonth,
			monthLabel: monthLabel(selectedMonth),
			matches: selected,
			group: {
				name: GROUP_PROFILE.name,
				address: GROUP_PROFILE.address,
				defaultVenue: GROUP_PROFILE.defaultVenue,
			},
		});
		downloadMonthlyReport(snapshot, format);
	};
	return (
		<div className="admin-content">
			<div className="admin-heading">
				<div>
					<span className="eyebrow">SỔ QUỸ NHÓM</span>
					<h1>Báo cáo tháng</h1>
					<p>Đọc nhanh dòng tiền và xem khoản nào chiếm nhiều nhất.</p>
				</div>
				<div className="report-actions">
					<label className="month-select">
						Kỳ báo cáo
						<select
							value={selectedMonth}
							onChange={(e) => setSelectedMonth(e.target.value)}
						>
							{[...new Set([...months, selectedMonth])].sort().reverse().map((month) => (
								<option key={month} value={month}>
									{monthLabel(month)}
								</option>
							))}
						</select>
					</label>
					<button
						type="button"
						className="button button-primary"
						onClick={() => exportReport("txt")}
					>
						<Download size={16} /> Xuất hóa đơn TXT
					</button>
					<button
						type="button"
						className="subtle-button"
						onClick={() => exportReport("json")}
					>
						<Download size={16} /> Tải tháng JSON
					</button>
					<button
						type="button"
						className="subtle-button"
						onClick={exportBackup}
					>
						<Download size={16} /> Sao lưu toàn bộ JSON
					</button>
				</div>
			</div>
			<div className="kpi-grid report-kpis">
				<KpiCard
					label="Số trận"
					value={String(selected.length)}
					note="trong kỳ đã chọn"
					icon={CalendarDays}
					tone="blue"
				/>
				<KpiCard
					label="Tổng thu"
					value={money.format(income)}
					note="đóng góp & quỹ nhóm"
					icon={CircleDollarSign}
					tone="green"
				/>
				<KpiCard
					label="Tổng chi"
					value={money.format(expense)}
					note="tất cả khoản chi"
					icon={ReceiptText}
					tone="orange"
				/>
				<KpiCard
					label="Bình quân / trận"
					value={money.format(selected.length ? expense / selected.length : 0)}
					note="mức chi trung bình"
					icon={Zap}
					tone="purple"
				/>
			</div>
			<div className="report-layout">
				<section className="admin-panel chart-panel">
					<div className="panel-heading">
						<div>
							<span className="eyebrow">TỔNG QUAN DÒNG TIỀN</span>
							<h2>Thu & chi trong kỳ</h2>
						</div>
						<div className="chart-legend">
							<span>
								<i className="legend-dot income-dot" /> Tổng thu
							</span>
							<span>
								<i className="legend-dot expense-dot" /> Tổng chi
							</span>
						</div>
					</div>
					<div
						className="bar-chart"
						role="img"
						aria-label="Biểu đồ so sánh tổng thu và tổng chi"
					>
						<div className="axis-label axis-top">
							{compactMoney.format(max)} đ
						</div>
						<div className="bars">
							<div className="bar-group">
								<div className="bar-value">{money.format(income)}</div>
								<div
									className="bar income-bar"
									style={{ height: `${(income / max) * 100}%` }}
								/>
								<span>Tổng thu</span>
							</div>
							<div className="bar-group">
								<div className="bar-value">{money.format(expense)}</div>
								<div
									className="bar expense-bar-chart"
									style={{ height: `${(expense / max) * 100}%` }}
								/>
								<span>Tổng chi</span>
							</div>
						</div>
						<div className="chart-baseline" />
						<p className="chart-caption">
							Số liệu được tính từ các buổi cầu đã ghi nhận trong{" "}
							{monthLabel(selectedMonth)}.
						</p>
					</div>
					<div className="accessible-table">
						<div>
							<span>Chỉ số</span>
							<strong>Giá trị</strong>
						</div>
						<div>
							<span>Tổng thu</span>
							<strong>{money.format(income)}</strong>
						</div>
						<div>
							<span>Tổng chi</span>
							<strong>{money.format(expense)}</strong>
						</div>
						<div>
							<span>Số dư</span>
							<strong>{money.format(income - expense)}</strong>
						</div>
					</div>
				</section>
				<section className="admin-panel category-panel">
					<div className="panel-heading">
						<div>
							<span className="eyebrow">PHÂN BỔ KHOẢN CHI</span>
							<h2>Chi vào đâu?</h2>
						</div>
					</div>
					{categories.length ? (
						<div className="category-list">
							{categories.map((item) => (
								<div className="category-report-row" key={item.category}>
									<div className={`expense-icon ${item.category}`}>
										{item.category === "water" ? (
											<Droplets size={16} />
										) : item.category === "court" ? (
											<MapPin size={16} />
										) : item.category === "shuttlecock" ? (
											<Trophy size={16} />
										) : (
											<ReceiptText size={16} />
										)}
									</div>
									<div>
										<strong>{expenseLabels[item.category]}</strong>
										<span>
											{money.format(item.amount)} ·{" "}
											{expense ? Math.round((item.amount / expense) * 100) : 0}%
										</span>
									</div>
									<div className="category-track">
										<span
											style={{
												width: `${expense ? (item.amount / expense) * 100 : 0}%`,
											}}
										/>
									</div>
								</div>
							))}
						</div>
					) : (
						<EmptyState text="Chưa có khoản chi trong kỳ này." />
					)}
				</section>
			</div>
		</div>
	);
}
function LoginPage({
	onLogin,
	onBack,
}: {
	onLogin: (username: string, password: string) => Promise<string>;
	onBack: () => void;
}) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);
	const submit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (saving) return;
		setSaving(true);
		setError("");
		try {
			setError(await onLogin(username.trim(), password));
		} catch (loginError) {
			setError(errorMessage(loginError, "Không thể đăng nhập."));
		} finally {
			setSaving(false);
		}
	};
	return (
		<div className="login-shell">
			<div className="login-decoration">
				<div className="login-orb orb-one" />
				<div className="login-orb orb-two" />
				<div className="login-court" />
				<div className="login-copy">
					<Logo />
					<span>{GROUP_PROFILE.name.toUpperCase()} · QUẢN TRỊ DỮ LIỆU</span>
					<h1>
						Mỗi trận cầu
						<br />
						<em>một câu chuyện rõ ràng.</em>
					</h1>
				</div>
			</div>
			<main className="login-card">
				<button type="button" className="back-link" onClick={onBack}>
					← Về trang thành viên
				</button>
				<div className="login-heading">
					<span className="login-icon">
						<ShieldCheck size={21} />
					</span>
					<span className="eyebrow">KHU VỰC QUẢN TRỊ</span>
					<h2>Chào mừng trở lại</h2>
					<p>Đăng nhập để cập nhật lịch đánh và thu chi của nhóm.</p>
				</div>
				<form onSubmit={submit}>
					<label>
						Email quản trị
						<input
							type="email"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							placeholder="admin@example.com"
						/>
					</label>
					<label>
						Mật khẩu
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="Nhập mật khẩu"
						/>
					</label>
					{error ? <div className="form-error">{error}</div> : null}
					<button type="submit" className="button button-primary login-submit" disabled={saving}>
						<LogIn size={17} /> {saving ? "Đang đăng nhập..." : "Đăng nhập"}
					</button>
				</form>
				<div className="demo-hint">
					<span>
						<Sparkles size={15} />{" "}
					</span>
				</div>
				<p className="login-disclaimer">
					Tài khoản được xác thực bằng Supabase Auth. Dữ liệu nhóm được lưu dùng chung
					trên Supabase.
				</p>
			</main>
		</div>
	);
}
function EmptyState({ text }: { text: string }) {
	return (
		<div className="empty-state">
			<CalendarDays size={24} />
			<p>{text}</p>
		</div>
	);
}

export default App;
