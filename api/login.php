<?php
require_once __DIR__ . '/bootstrap.php';
require_method('POST');

$data = json_input();

if (!isset($data['login']) || !isset($data['mot_de_passe'])) {
    http_response_code(400);
    echo json_encode(["erreur" => "Login et mot de passe requis"]);
    exit;
}

$login = trim($data['login']);
$mdp_saisi = $data['mot_de_passe'];

$stmt = $conn->prepare("SELECT id_utilisateur, login, mot_de_passe, role, nom, prenom FROM utilisateur WHERE login = ?");
$stmt->bind_param("s", $login);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(401);
    echo json_encode(["erreur" => "Identifiants invalides"]);
    exit;
}

$utilisateur = $result->fetch_assoc();

// verifierAncienMotDePasse / authentifier : on compare avec password_verify
if (!password_verify($mdp_saisi, $utilisateur['mot_de_passe'])) {
    http_response_code(401);
    echo json_encode(["erreur" => "Identifiants invalides"]);
    exit;
}

// Connexion valide : session serveur, jamais de mot de passe dans la réponse.
unset($utilisateur['mot_de_passe']);
session_regenerate_id(true);
$_SESSION['user'] = $utilisateur;
respond([
    "message" => "Connexion réussie",
    "utilisateur" => $utilisateur
]);
