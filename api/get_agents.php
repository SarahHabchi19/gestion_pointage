<?php
require_once __DIR__ . '/bootstrap.php';
require_auth();
$sql = "SELECT a.mat, a.nom, a.prenom, a.photo, a.cin, a.telephone, a.email, a.adresse, a.date_embauche, a.code_str, COALESCE(s.designation, a.code_str) AS structure, a.actif
FROM agent a LEFT JOIN structure s ON a.code_str = s.code_str ORDER BY a.nom, a.prenom";
$result = $conn->query($sql);
if (!$result) db_error();
$agents = [];
while($row = $result->fetch_assoc()){
	$agents[] = $row;
}

respond(['agents' => $agents]);
