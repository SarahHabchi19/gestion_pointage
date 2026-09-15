<?php
$page = basename(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '');
$allowed = ['index.html', 'dashboard.html', 'admin.html', 'rapports.html', 'settings.html'];
if (!in_array($page, $allowed, true)) {
    http_response_code(404);
    exit('Page introuvable');
}
$file = __DIR__ . DIRECTORY_SEPARATOR . $page;
if (!is_file($file)) {
    http_response_code(404);
    exit('Page introuvable');
}
$html = file_get_contents($file);
$html = preg_replace('#<script\b[^>]*>.*?</script>#is', '', $html);
$appVersion = filemtime(__DIR__ . DIRECTORY_SEPARATOR . 'js' . DIRECTORY_SEPARATOR . 'app.js') ?: time();
$html = str_ireplace('</body>', "<script src=\"js/app.js?v={$appVersion}\"></script>\n</body>", $html);
header('Content-Type: text/html; charset=utf-8');
echo $html;
