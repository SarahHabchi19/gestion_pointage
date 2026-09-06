<?php
require_once __DIR__ . '/bootstrap.php';
require_method('POST');
require_auth(true);

$data = json_input();

// Validation des champs obligatoires
$champsObligatoires = ['mat', 'nom', 'prenom', 'email', 'code_str'];

foreach ($champsObligatoires as $champ) {
    if (!isset($data[$champ]) || empty(trim($data[$champ]))) {
        respond(["erreur" => "Le champ '$champ' est obligatoire"], 422);
    }
}

// Variables pour bind_param()
$mat = $data['mat'];
$nom = $data['nom'];
$prenom = $data['prenom'];
$photo = $data['photo'] ?? null;
$cin = $data['cin'] ?? null;
$telephone = $data['telephone'] ?? null;
$email = $data['email'];
$adresse = $data['adresse'] ?? null;
$date_embauche = $data['date_embauche'] ?? null;
$code_str = $data['code_str'];

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['erreur' => 'Adresse e-mail invalide'], 422);

$stmt = $conn->prepare("INSERT INTO agent 
    (mat, nom, prenom, photo, cin, telephone, email, adresse, date_embauche, code_str, actif)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)");
if (!$stmt) db_error();

$stmt->bind_param(
    "ssssssssss",
    $mat,
    $nom,
    $prenom,
    $photo,
    $cin,
    $telephone,
    $email,
    $adresse,
    $date_embauche,
    $code_str
);

if ($stmt->execute()) {
    respond([
        "message" => "Agent ajouté avec succès",
        "mat" => $mat
    ], 201);
} else {
    if ($conn->errno === 1062) respond(['erreur' => 'Ce matricule existe déjà.'], 409);
    if ($conn->errno === 1452) respond(['erreur' => 'La structure indiquée est invalide.'], 422);
    db_error();
}
