CREATE EXTENSION pgmq;

SELECT pgmq.create('net-addr-activity');
SELECT pgmq.create('coords-activity');
SELECT pgmq.create('new-plan');
