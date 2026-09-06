<?php
require_once __DIR__ . '/bootstrap.php';
require_auth();
global $conn;
$sql = "SELECT COUNT(*) AS total, SUM(actif = 1) AS actifs, SUM(actif = 0) AS inactifs FROM agent";
$agents = $conn->query($sql);
if (!$agents) db_error();
$summary = $agents->fetch_assoc();
$today = $conn->query("SELECT code_situation, COUNT(*) AS total FROM situation_jour WHERE date_jour = CURDATE() GROUP BY code_situation");
if (!$today) db_error();
$situations = [];
while ($row = $today->fetch_assoc()) $situations[$row['code_situation']] = (int)$row['total'];
respond(['agents' => ['total' => (int)$summary['total'], 'actifs' => (int)$summary['actifs'], 'inactifs' => (int)$summary['inactifs']], 'situations_aujourdhui' => $situations]);
