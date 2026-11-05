-- 030_event_response.sql
--
-- A reply from the company: they got back, on a channel, and the role
-- takes whatever status that reply leaves it in. Withdrawn covers a
-- callback you declined before interviewing.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'response';
