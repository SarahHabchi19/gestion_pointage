<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}
mysqli_report(MYSQLI_REPORT_OFF);
header('Content-Type: application/json; charset=utf-8');
// The application is served from the same WAMP host.  Keep the API usable
// from the front-end while also handling the methods actually used by it.
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$conn = new mysqli('localhost', 'root', '', 'controle_acces');

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["erreur" => "Connexion à la base échouée"]);
    exit;
}

$conn->set_charset('utf8mb4');
