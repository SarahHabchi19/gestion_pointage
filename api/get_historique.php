<?php
require_once __DIR__ . '/bootstrap.php';
require_auth();
global $conn;
$dateDebut = $_GET['date_debut'] ?? date('Y-m-01');
$dateFin = $_GET['date_fin'] ?? date('Y-m-d');
$mat = trim($_GET['mat'] ?? '');
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateDebut) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFin)) respond(['erreur' => 'Format de date invalide.'], 422);
if ($dateDebut > $dateFin) respond(['erreur' => 'La date de début doit précéder la date de fin.'], 422);
$sql = "SELECT sj.mat, a.nom, a.prenom, COALESCE(s.designation, a.code_str) AS structure, sj.date_jour, sj.heure_entree, sj.heure_sortie, COALESCE(ts.designation, sj.code_situation) AS situation
        FROM situation_jour sj JOIN agent a ON a.mat=sj.mat LEFT JOIN structure s ON s.code_str=a.code_str LEFT JOIN type_situation ts ON ts.code_situation=sj.code_situation
        WHERE sj.date_jour BETWEEN ? AND ?";
if ($mat !== '') $sql .= ' AND sj.mat = ?';
$sql .= ' ORDER BY sj.date_jour DESC, a.nom';
$stmt = $conn->prepare($sql);
if (!$stmt) db_error();
if ($mat !== '') $stmt->bind_param('sss', $dateDebut, $dateFin, $mat); else $stmt->bind_param('ss', $dateDebut, $dateFin);
$stmt->execute();
$result = $stmt->get_result();
$rows = [];
while ($row = $result->fetch_assoc()) $rows[] = $row;
respond(['historique' => $rows]);
