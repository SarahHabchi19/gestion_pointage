<?php
require_once __DIR__ . '/bootstrap.php';
require_method('PATCH');
require_auth(true);
$data = json_input();
$mat = trim($data['mat'] ?? '');
if ($mat === '') respond(['erreur' => 'Matricule obligatoire.'], 422);
global $conn;
$stmt = $conn->prepare('UPDATE agent SET actif = 0 WHERE mat = ?');
if (!$stmt) db_error();
$stmt->bind_param('s', $mat);
if (!$stmt->execute()) db_error();
if ($stmt->affected_rows === 0) respond(['erreur' => 'Agent introuvable ou déjà désactivé.'], 404);
respond(['message' => 'Agent désactivé avec succès.']);
