<?php
require 'vendor/autoload.php';
use Symfony\Component\Process\Process;

$pythonPath = __DIR__ . '/storage/app/arkas_engine/python.exe';
$scriptPath = __DIR__ . '/storage/app/arkas_engine/query.py';

$env = getenv();
unset($env['OPENSSL_CONF']);

$process = new Process([$pythonPath, $scriptPath, 'Kertas Pasir'], null, $env);
$process->run();
echo $process->getOutput();
echo "\nERR:\n" . $process->getErrorOutput();
