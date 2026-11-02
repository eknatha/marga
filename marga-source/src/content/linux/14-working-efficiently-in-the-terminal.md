---
title: Working efficiently in the terminal
minutes: 12
summary: Move faster and make fewer mistakes with shell history, keyboard shortcuts, tmux sessions, a safe editor setup, aliases and dotfiles you can carry between machines.
---

Operations work happens in a terminal, often over a slow connection and often under stress. Small habits decide whether you type a command twice or ten times, lose a session when the network drops, or run a destructive command in the wrong place. This lesson collects the habits that pay off most.

## What you will learn

- Shell history and line-editing shortcuts
- Persistent sessions with `tmux`
- Basic editing in `vim` or `nano` over SSH
- Aliases, functions and a prompt that prevents mistakes
- Keeping your setup in dotfiles

## History and shortcuts

| Keys | Action |
|------|--------|
| `Ctrl+R` | Search history backwards while typing |
| `Ctrl+A` / `Ctrl+E` | Start or end of the line |
| `Ctrl+W` | Delete the previous word |
| `Alt+.` | Insert the last argument of the previous command |
| `!!` | Repeat the previous command (`sudo !!` runs it with sudo) |
| `Ctrl+L` | Clear the screen |

```bash
HISTSIZE=50000 HISTFILESIZE=100000
HISTCONTROL=ignoreboth:erasedups   # skip duplicates and commands starting with a space
shopt -s histappend                # keep history from all open shells
```

A command starting with a space is not saved, which is useful when a secret appears on the command line (better still: avoid secrets on command lines).

## Sessions that survive: tmux

```bash
tmux new -s fix          # start a named session
# Ctrl+B then d          # detach, the session keeps running
tmux attach -t fix       # come back later, even from another connection
# Ctrl+B then %          # split left and right
# Ctrl+B then "          # split top and bottom
```

A long job started inside `tmux` is not lost if your connection drops, and a colleague can attach to the same session to watch or help.

## Editing on a server

Learn the few keys of one editor that exists everywhere. In `vim`: `i` to insert, `Esc` to leave insert mode, `:w` save, `:q` quit, `:q!` quit without saving, `/word` search, `dd` delete a line, `u` undo. If you prefer, `nano` shows its keys at the bottom. Edit with `sudoedit /etc/file` rather than `sudo vim`, so the editor runs as you and the change is saved safely.

## Aliases, functions and a safer prompt

```bash
alias ll='ls -lah'
alias k=kubectl
mkcd() { mkdir -p "$1" && cd "$1"; }
export PS1='\u@\h:\w\$ '    # show user, host and directory
```

Show the host name clearly, and use a different colour for production hosts, so you notice before running a destructive command. For Kubernetes, show the current context in the prompt for the same reason.

## Dotfiles

Keep `.bashrc`, `.vimrc`, `.tmux.conf` and similar files in one directory under version control, and install them with a small script that creates symbolic links. A new machine then feels familiar in minutes. Keep secrets out of dotfiles.

```predict
Q: You typed a long command and notice a typo near the start. What is the fastest safe edit?
???
Use Ctrl+A or Alt+B to move to the typo and fix it, or press Ctrl+X Ctrl+E to open the line in your editor.
> Editing the line avoids retyping and avoids running a half-typed command. Ctrl+X Ctrl+E opens the command in $EDITOR in bash.
```

## Incident: the wrong host

> **Incident:** An engineer runs `rm -rf /var/lib/app/cache` to free space, in a terminal that was connected to production instead of staging.

```console
$ hostname
prod-web-03
```

Both terminals looked the same. The team set a red background and a clear host name in the prompt for production, added a confirmation wrapper for destructive commands on production hosts, and used `tmux` window names such as "STAGING" and "PROD".

## Common mistakes

- Long jobs run without `tmux` or `nohup`
- Identical-looking prompts for every environment
- Editing system files as root in a full editor session
- Secrets typed on the command line and kept in history

```quiz
Q: Which key combination searches shell history while you type?
- Ctrl+L :: It clears the screen.
+ Ctrl+R
- Ctrl+W :: It deletes a word.
- Ctrl+Z :: It suspends the job.
> Ctrl+R finds earlier commands that match what you type.

Q: Why use tmux on a remote server?
+ A session keeps running when your connection drops, and you can reattach
- It makes the network faster :: It does not change the network.
- It encrypts files :: It is a terminal multiplexer, not an encryption tool.
- It replaces SSH :: You still connect with SSH.
> Detached sessions survive disconnections.

Q: What does sudoedit do better than sudo vim?
- It is faster to type :: Speed is not the point.
+ It edits a copy as your user and saves it with privileges, avoiding a root editor session
- It removes comments :: It does not change content.
- It locks the network :: Unrelated.
> The editor and its plugins do not run as root.

Q: How can you reduce the chance of running a command on the wrong host?
+ Make the prompt show the host and mark production clearly
- Use shorter commands :: Length is not the cause.
- Disable history :: History is not the cause.
- Use only one terminal :: That increases confusion.
> A visible difference between environments prevents most wrong-host mistakes.
```

```cards
How do you re-run the last command with sudo? :: sudo !!
What detaches a tmux session? :: Ctrl+B then d
Which key inserts the last argument of the previous command? :: Alt+.
Why start a command with a space? :: Bash may skip it in history
Where to keep your setup? :: Dotfiles under version control, without secrets
```
