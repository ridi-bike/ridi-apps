-- name: SendMessage :exec
SELECT * from pgmq.send(
  queue_name => sqlc.arg(queue_name)::text,
  msg        => sqlc.arg(message)::jsonb
);

-- name: PollMessages :many
SELECT
    msg_id::integer,
    read_ct::integer,
    enqueued_at::timestamp,
    vt::timestamp as visibility_timeout,
    message:: jsonb
FROM pgmq.read(
  queue_name => sqlc.arg(queue_name)::text,
  vt         => sqlc.arg(visibility_timeout_seconds)::integer,
  qty        => sqlc.arg(qty)::integer
);

-- name: ArchiveMessage :exec
SELECT pgmq.archive(
  queue_name => sqlc.arg(queue_name)::text,
  msg_id     => sqlc.arg(message_id)::integer
);

-- name: ArchiveMessages :exec
SELECT pgmq.archive(
  queue_name => sqlc.arg(queue_name)::text,
  msg_ids    => sqlc.arg(message_ids)::integer[]
);

-- name: DeleteMessage :exec
SELECT pgmq.delete(
  queue_name => sqlc.arg(queue_name)::text,
  msg_id     => sqlc.arg(message_id)::integer
);

-- name: DeleteMessages :exec
SELECT pgmq.delete(
  queue_name => sqlc.arg(queue_name)::text,
  msg_ids    => sqlc.arg(message_id)::integer[]
);
