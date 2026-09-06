<?php
require_once __DIR__ . '/bootstrap.php';
require_method('PUT');
$sessionUser = require_auth();
$data = json_input();
$nom = trim($data['nom'] ?? '');
$prenom = trim($data['prenom'] ?? '');
$email = trim($data['email'] ?? '');
$telephone = trim($data['telephone'] ?? '');
if ($nom === '' || $prenom === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['erreur' => 'Nom, prénom et e-mail valide sont obligatoires.'], 422);
global $conn;
$stmt = $conn->prepare('UPDATE utilisateur SET nom=?, prenom=?, email=?, telephone=? WHERE id_utilisateur=?');
if (!$stmt) db_error();
$stmt->bind_param('ssssi', $nom, $prenom, $email, $telephone, $sessionUser['id_utilisateur']);
if (!$stmt->execute()) {
    if ($conn->errno === 1062) respond(['erreur' => 'Cette adresse e-mail est déjà utilisée.'], 409);
    db_error();
}
$_SESSION['user']['nom'] = $nom;
$_SESSION['user']['prenom'] = $prenom;
respond(['message' => 'Profil mis à jour avec succès.']);
