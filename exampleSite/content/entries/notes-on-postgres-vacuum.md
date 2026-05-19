---
title: "Notes on Postgres VACUUM"
date: 2026-05-18T14:12:00+03:00
draft: false
tags: ["postgres", "notebook", "ops"]
---

Some scattered notes from a week of fighting bloat.

`VACUUM` does not return space to the operating system. It marks dead
tuples reusable, which is fine for steady-state tables, but useless when
you've just deleted half a table and want the disk back. For that you need
`VACUUM FULL`, which takes an exclusive lock, or one of the extension-based
online repackers like `pg_repack`.

A few rules of thumb I've ended up trusting:

- If a table's autovacuum keeps getting cancelled by a lock, you almost
  always have a long-running transaction somewhere. Look at
  `pg_stat_activity` ordered by `xact_start`.
- The default `autovacuum_vacuum_scale_factor` of 0.2 is too lazy for big
  tables. For anything past a few million rows, lower it per-table.
- `n_dead_tup` in `pg_stat_user_tables` lies a little — it's an estimate.
  But it's a directionally useful estimate.

```sql
ALTER TABLE big_thing SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.01
);
```

The hardest bug I hit this week was a table where autovacuum ran
constantly, but `n_dead_tup` never went down. The cause: a replication
slot on a downstream replica had stopped consuming, which pinned `xmin`
and made every dead row still potentially visible to that slot. VACUUM
ran and did nothing. The fix was to drop the orphaned slot. The lesson is
that VACUUM's job is bounded by what the oldest transaction in the system
can still see, including transactions on other machines.
