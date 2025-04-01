-- name: SendMessage :exec
SELECT * from pgmq.send(
  queue_name => sqlc.arg(queue_name)::text,
  msg        => sqlc.arg(message)::jsonb
);

SELECT * from pgmq.send(
  queue_name => 'route_map_gen',
  msg        => '{"routeId":"2v7dL7siziErqL2y0Fz9ABuzkTQ"}'
);

-- name: ReadMessages :many
SELECT
    msg_id::bigint,
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
  msg_id     => sqlc.arg(message_id)::bigint
);

-- name: ArchiveMessages :exec
SELECT pgmq.archive(
  queue_name => sqlc.arg(queue_name)::text,
  msg_ids    => sqlc.arg(message_ids)::bigint[]
);

-- name: DeleteMessage :exec
SELECT pgmq.delete(
  queue_name => sqlc.arg(queue_name)::text,
  msg_id     => sqlc.arg(message_id)::bigint
);

-- name: DeleteMessages :exec
SELECT pgmq.delete(
  queue_name => sqlc.arg(queue_name)::text,
  msg_ids    => sqlc.arg(message_id)::bigint[]
);

-- name: ReadMessagesWithLongPoll :many
SELECT
    msg_id::bigint,
    read_ct::integer,
    enqueued_at::timestamp,
    vt::timestamp as visibility_timeout,
    message:: jsonb
FROM pgmq.read_with_poll(
  sqlc.arg(queue_name)::text,
  sqlc.arg(visibility_timeout_seconds)::integer,
  sqlc.arg(qty)::integer,
  sqlc.arg(max_poll_seconds)::integer,
  sqlc.arg(internal_poll_ms)::integer
);

-- name: UpdateVisibilityTimeout :one
SELECT
    msg_id::bigint,
    read_ct::integer,
    enqueued_at::timestamp,
    vt::timestamp as visibility_timeout,
    message:: jsonb
FROM pgmq.set_vt(
  sqlc.arg(queue_name)::text,
  sqlc.arg(message_id)::bigint,
  sqlc.arg(visibility_timeout_seconds)::integer
);
