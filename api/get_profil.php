<?php
require_once __DIR__ . '/bootstrap.php';
$sessionUser = require_auth();
global $conn;
$stmt = $conn->prepare('SELECT id_utilisateur, login, role, nom, prenom, telephone, email, adresse_bureau FROM utilisateur WHERE id_utilisateur=?');
if (!$stmt) db_error();
$stmt->bind_param('i', $sessionUser['id_utilisateur']);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
if (!$user) respond(['erreur' => 'Utilisateur introuvable.'], 404);
respond(['utilisateur' => $user]);
