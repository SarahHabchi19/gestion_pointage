<?php
require_once __DIR__ . '/bootstrap.php';
require_method('PUT');
require_auth(true);
$data = json_input();
$mat = trim($data['mat'] ?? '');
$nom = isset($data['nom']) ? trim($data['nom']) : null;
$prenom = isset($data['prenom']) ? trim($data['prenom']) : null;
if ($mat === '') respond(['erreur' => 'Matricule obligatoire.'], 422);

global $conn;
$currentStmt = $conn->prepare('SELECT nom, prenom, telephone, email, adresse, date_embauche, code_str, actif FROM agent WHERE mat=?');
if (!$currentStmt) db_error();
$currentStmt->bind_param('s', $mat);
$currentStmt->execute();
$current = $currentStmt->get_result()->fetch_assoc();
if (!$current) respond(['erreur' => 'Agent introuvable.'], 404);

// Preserve fields omitted by the client.  A partial update must never erase
// contact data or silently reactivate a disabled agent.
$fields = [
    'nom' => $nom ?? $current['nom'],
    'prenom' => $prenom ?? $current['prenom'],
    'telephone' => array_key_exists('telephone', $data) ? $data['telephone'] : $current['telephone'],
    'email' => array_key_exists('email', $data) ? $data['email'] : $current['email'],
    'adresse' => array_key_exists('adresse', $data) ? $data['adresse'] : $current['adresse'],
    'date_embauche' => array_key_exists('date_embauche', $data) ? $data['date_embauche'] : $current['date_embauche'],
    'code_str' => array_key_exists('code_str', $data) ? $data['code_str'] : $current['code_str'],
    'actif' => array_key_exists('actif', $data) ? (int)(bool)$data['actif'] : (int)$current['actif']
];
if ($fields['nom'] === '' || $fields['prenom'] === '') respond(['erreur' => 'Nom et prénom sont obligatoires.'], 422);
if ($fields['email'] !== null && $fields['email'] !== '' && !filter_var($fields['email'], FILTER_VALIDATE_EMAIL)) respond(['erreur' => 'Adresse e-mail invalide.'], 422);
$stmt = $conn->prepare('UPDATE agent SET nom=?, prenom=?, telephone=?, email=?, adresse=?, date_embauche=?, code_str=?, actif=? WHERE mat=?');
if (!$stmt) db_error();
$stmt->bind_param('sssssssis', $fields['nom'], $fields['prenom'], $fields['telephone'], $fields['email'], $fields['adresse'], $fields['date_embauche'], $fields['code_str'], $fields['actif'], $mat);
if (!$stmt->execute()) {
    if ($conn->errno === 1062 || $conn->errno === 1452) respond(['erreur' => 'Les données sont déjà utilisées ou la structure est invalide.'], 409);
    db_error();
}
respond(['message' => 'Agent modifié avec succès.']);
