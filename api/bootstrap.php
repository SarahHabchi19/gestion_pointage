<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

function json_input(): array {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        respond(['erreur' => 'Corps JSON invalide'], 400);
    }
    return $data;
}

function respond(array $payload, int $status = 200) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function require_method(string $method): void {
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        respond(['erreur' => 'Méthode non autorisée'], 405);
    }
}

function valid_password(string $password): bool {
    return strlen($password) >= 8
        && preg_match('/[A-Za-z]/', $password)
        && preg_match('/\d/', $password)
        && preg_match('/[^A-Za-z\d]/', $password);
}

function require_auth(bool $adminOnly = false): array {
    if (empty($_SESSION['user'])) {
        respond(['erreur' => 'Authentification requise'], 401);
    }
    $user = $_SESSION['user'];
    if ($adminOnly && ($user['role'] ?? '') !== 'Administrateur') {
        respond(['erreur' => 'Accès administrateur requis'], 403);
    }
    return $user;
}

function db_error() {
    respond(['erreur' => 'Une erreur de base de données est survenue.'], 500);
}
