-- Import các buổi cầu được cung cấp ngày 01/10/2026.
-- Chạy sau khi đã chạy supabase/schema.sql.
-- Attendance IDs cũ member-1...member-8 được ánh xạ sang UUID roster đã seed.

insert into public.matches (
  id,
  starts_at,
  venue,
  address,
  court_number,
  income_items,
  expense_items,
  attendance_ids,
  notes,
  created_at,
  updated_at
)
values
(
  '20000000-0000-4000-8000-000000000001',
  '2026-09-25T12:00:00.000Z',
  'Sân cầu lông PIXIHUB',
  '10 Bế Văn Cấm, Tân Hưng, Hồ Chí Minh',
  'sân 3',
  '[{"id":"m09ilcdk","label":"Đóng góp thành viên","amount":0}]'::jsonb,
  '[{"id":"w3hweuov","category":"court","label":"Tiền sân","amount":278000},{"id":"q6t2n3qi","category":"water","label":"Nuoc","amount":20000},{"id":"woy241ll","category":"shuttlecock","label":"ống cầu mới","amount":300000}]'::jsonb,
  '["10000000-0000-4000-8000-000000000005","10000000-0000-4000-8000-000000000001","10000000-0000-4000-8000-000000000007","10000000-0000-4000-8000-000000000008","10000000-0000-4000-8000-000000000002"]'::jsonb,
  null,
  '2026-10-01T07:49:54.026Z',
  '2026-10-01T07:49:54.026Z'
),
(
  '20000000-0000-4000-8000-000000000002',
  '2026-09-18T12:00:00.000Z',
  'Sân cầu lông PIXIHUB',
  '10 Bế Văn Cấm, Tân Hưng, Hồ Chí Minh',
  'sân 1',
  '[{"id":"ttcu6gxb","label":"Đóng góp thành viên","amount":0}]'::jsonb,
  '[{"id":"m4rb9uf9","category":"court","label":"Tiền sân","amount":278000},{"id":"wlhlqpsw","category":"water","label":"trà đá","amount":20000}]'::jsonb,
  '["10000000-0000-4000-8000-000000000005","10000000-0000-4000-8000-000000000001","10000000-0000-4000-8000-000000000007","10000000-0000-4000-8000-000000000008","10000000-0000-4000-8000-000000000002"]'::jsonb,
  null,
  '2026-10-01T07:48:52.639Z',
  '2026-10-01T07:48:52.639Z'
),
(
  '20000000-0000-4000-8000-000000000003',
  '2026-09-11T12:00:00.000Z',
  'Sân cầu lông PIXIHUB',
  '10 Bế Văn Cấm, Tân Hưng, Hồ Chí Minh',
  'sân 1',
  '[{"id":"qom2y6z3","label":"Đóng góp thành viên","amount":0}]'::jsonb,
  '[{"id":"zhlpd3j9","category":"court","label":"Tiền sân","amount":278000},{"id":"9wa8ue24","category":"court","label":"trà đá","amount":20000},{"id":"27hutwb0","category":"shuttlecock","label":"ống cầu mứới","amount":300000},{"id":"68nsmzbu","category":"shuttlecock","label":"cau them","amount":139000}]'::jsonb,
  '["10000000-0000-4000-8000-000000000001","10000000-0000-4000-8000-000000000005","10000000-0000-4000-8000-000000000007","10000000-0000-4000-8000-000000000008","10000000-0000-4000-8000-000000000002"]'::jsonb,
  null,
  '2026-10-01T07:47:37.258Z',
  '2026-10-01T07:53:47.194Z'
),
(
  '20000000-0000-4000-8000-000000000004',
  '2026-10-02T13:00:00.000Z',
  'Sân cầu lông PIXIHUB',
  '10 Bế Văn Cấm, Tân Hưng, Hồ Chí Minh',
  'sân 3',
  '[{"id":"fdkezu5q","label":"Đóng góp thành viên","amount":0}]'::jsonb,
  '[{"id":"2rwylz0s","category":"court","label":"Tiền sân","amount":278000},{"id":"t4lyv7xy","category":"water","label":"Trà đá","amount":17000}]'::jsonb,
  '["10000000-0000-4000-8000-000000000003","10000000-0000-4000-8000-000000000005","10000000-0000-4000-8000-000000000007","10000000-0000-4000-8000-000000000008"]'::jsonb,
  null,
  '2026-10-01T07:45:06.228Z',
  '2026-10-01T07:45:06.228Z'
)
on conflict (id) do update set
  starts_at = excluded.starts_at,
  venue = excluded.venue,
  address = excluded.address,
  court_number = excluded.court_number,
  income_items = excluded.income_items,
  expense_items = excluded.expense_items,
  attendance_ids = excluded.attendance_ids,
  notes = excluded.notes,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
