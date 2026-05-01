<?php
require 'vendor/autoload.php';
use Symfony\Component\Process\Process;

$pythonPath = __DIR__ . '/storage/app/arkas_engine/python.exe';
$scriptPath = __DIR__ . '/storage/app/arkas_engine/query.py';

// Empty environment to simulate Apache
$env = [];

$process = new Process([$pythonPath, $scriptPath, 'Kertas Pasir'], null, $env);
$process->run();
echo "OUT:\n" . $process->getOutput();
echo "\nERR:\n" . $process->getErrorOutput();
