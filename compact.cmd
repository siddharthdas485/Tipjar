@echo off
wsl bash -c "cd '/mnt/c/demo midnight' && rm -rf contract/src/managed/tipjar && ~/.local/bin/compact compile contract/src/tipjar.compact contract/src/managed/tipjar"
