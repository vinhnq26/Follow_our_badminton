import type { Session } from "@supabase/supabase-js";
import type { ExpenseLine, FinanceLine, Match, MatchDraft, Member } from "./types";
import { supabase } from "./lib/supabase";

type DbMember = {
	id: string;
	name: string;
	active: boolean;
	removed_at: string | null;
};

type DbMatch = {
	id: string;
	starts_at: string;
	venue: string;
	address: string;
	court_number: string;
	income_items: FinanceLine[] | null;
	expense_items: ExpenseLine[] | null;
	attendance_ids: string[] | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
};

const missingConfigError = new Error(
	"Chưa cấu hình Supabase. Hãy tạo file .env.local với VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.",
);

const client = () => {
	if (!supabase) throw missingConfigError;
	return supabase;
};

const uuid = () =>
	typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: `00000000-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`;

const asArray = <T,>(value: T[] | null | undefined) =>
	Array.isArray(value) ? value : [];

const mapMember = (row: DbMember): Member => ({
	id: row.id,
	name: row.name,
	active: row.active,
	...(row.removed_at ? { removedAt: row.removed_at } : {}),
});

const mapMatch = (row: DbMatch): Match => ({
	id: row.id,
	startsAt: row.starts_at,
	venue: row.venue,
	address: row.address,
	courtNumber: row.court_number,
	incomeItems: asArray(row.income_items),
	expenseItems: asArray(row.expense_items),
	attendanceIds: asArray(row.attendance_ids),
	...(row.notes ? { notes: row.notes } : {}),
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});

export const loadSnapshot = async (): Promise<{
	members: Member[];
	matches: Match[];
}> => {
	const db = client();
	const [membersResult, matchesResult] = await Promise.all([
		db.from("members").select("*").order("name", { ascending: true }),
		db.from("matches").select("*").order("starts_at", { ascending: false }),
	]);
	if (membersResult.error) throw membersResult.error;
	if (matchesResult.error) throw matchesResult.error;
	return {
		members: (membersResult.data as DbMember[]).map(mapMember),
		matches: (matchesResult.data as DbMatch[]).map(mapMatch),
	};
};

export const saveMatchRemote = async (
	draft: MatchDraft,
	id?: string,
): Promise<Match> => {
	const db = client();
	const now = new Date().toISOString();
	const matchId = id || uuid();
	const row = {
		id: matchId,
		starts_at: draft.startsAt,
		venue: draft.venue,
		address: draft.address,
		court_number: draft.courtNumber,
		income_items: draft.incomeItems,
		expense_items: draft.expenseItems,
		attendance_ids: draft.attendanceIds,
		notes: draft.notes || null,
		updated_at: now,
		...(id ? {} : { created_at: now }),
	};
	const result = await db.from("matches").upsert(row).select("*").single();
	if (result.error) throw result.error;
	return mapMatch(result.data as DbMatch);
};

export const deleteMatchRemote = async (id: string) => {
	const result = await client().from("matches").delete().eq("id", id);
	if (result.error) throw result.error;
};

export const addMemberRemote = async (name: string): Promise<Member> => {
	const now = new Date().toISOString();
	const result = await client()
		.from("members")
		.insert({ id: uuid(), name, active: true, created_at: now, updated_at: now })
		.select("*")
		.single();
	if (result.error) throw result.error;
	return mapMember(result.data as DbMember);
};

const setMemberActive = async (id: string, active: boolean) => {
	const result = await client()
		.from("members")
		.update({
			active,
			removed_at: active ? null : new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq("id", id)
		.select("*")
		.single();
	if (result.error) throw result.error;
	return mapMember(result.data as DbMember);
};

export const archiveMemberRemote = (id: string) => setMemberActive(id, false);
export const restoreMemberRemote = (id: string) => setMemberActive(id, true);

export const signIn = async (email: string, password: string): Promise<Session> => {
	const result = await client().auth.signInWithPassword({ email, password });
	if (result.error || !result.data.session)
		throw result.error || new Error("Đăng nhập không thành công.");
	return result.data.session;
};

export const signOut = async () => {
	const result = await client().auth.signOut();
	if (result.error) throw result.error;
};

export const getSession = async () => {
	const result = await client().auth.getSession();
	if (result.error) throw result.error;
	return result.data.session;
};

export const isCurrentUserAdmin = async () => {
	const result = await client().rpc("is_current_user_admin");
	if (result.error) throw result.error;
	return result.data === true;
};

export { client as getSupabaseClient };
