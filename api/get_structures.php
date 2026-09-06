<?php
require_once __DIR__ . '/bootstrap.php';
require_auth();

global $conn;
$result = $conn->query('SELECT code_str, designation, type_str, code_str_rattachement FROM structure WHERE actif = 1 ORDER BY designation');
if (!$result) db_error();
$structures = [];
while ($row = $result->fetch_assoc()) $structures[] = $row;
respond(['structures' => $structures]);
