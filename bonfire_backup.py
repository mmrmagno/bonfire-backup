import os
import shutil
import subprocess
import json
import platform
import tkinter as tk
from tkinter import messagebox, simpledialog
import vdf

CONFIG_FILE = "backup_config.json"

GAME_PATHS = {
    "Dark Souls": {
        "Windows": r"~\Documents\NBGI\DarkSouls",
        "Linux": None
    },
    "Dark Souls II": {
        "Windows": r"~\AppData\Roaming\DarkSoulsII",
        "Linux": r"~/.steam/steam/userdata/[USER_ID]/236430/remote"
    },
    "Dark Souls III": {
        "Windows": r"~\AppData\Roaming\DarkSoulsIII",
        "Linux": r"~/.steam/steam/userdata/[USER_ID]/398710/remote"
    },
    "Elden Ring": {
        "Windows": r"~\AppData\Roaming\EldenRing",
        "Linux": r"~/.steam/steam/userdata/[USER_ID]/1245620/remote"
    }
}

def get_steam_user_data_path():
    os_type = platform.system()
    if os_type == 'Windows':
        steam_path = os.path.expandvars(r"%ProgramFiles(x86)%\Steam\userdata")
    elif os_type == 'Linux':
        steam_path = os.path.expanduser('~/.steam/steam/userdata')
    else:
        raise OSError('Unsupported operating system')
    return steam_path

def find_username(user_id):
    userdata_path = get_steam_user_data_path()
    user_path = os.path.join(userdata_path, str(user_id), 'config', 'localconfig.vdf')
    
    if not os.path.isfile(user_path):
        raise FileNotFoundError(f"No localconfig.vdf found for user ID {user_id}")

    with open(user_path, 'r', encoding='utf-8') as f:
        config_data = vdf.load(f)

    try:
        username = config_data['UserLocalConfigStore']['friends']['PersonaName']
        return username
    except KeyError:
        raise KeyError("Could not find the username in the config file.")

def get_steam_user_ids():
    userdata_path = get_steam_user_data_path()
    return [d for d in os.listdir(userdata_path) if os.path.isdir(os.path.join(userdata_path, d))]

def get_save_files_path(game, user_id):
    system = platform.system()
    path_template = GAME_PATHS[game].get(system)

    if not path_template:
        raise NotImplementedError(f"Save path for {game} on {system} is not supported.")

    if system == "Windows":
        base_path = os.path.expanduser(path_template)
        if game == "Dark Souls III":
            return base_path
        return base_path
    elif system == "Linux":
        save_path = os.path.expanduser(path_template.replace("[USER_ID]", user_id))
        if os.path.exists(save_path):
            return save_path
        else:
            raise FileNotFoundError(f"Save path not found for user ID {user_id}.")
    else:
        raise NotImplementedError(f"This script currently only supports Windows and Linux for {game}.")

def check_git_installed():
    try:
        subprocess.run(["git", "--version"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError:
        messagebox.showerror("Error", "Git is not installed. Please install Git and try again.")
        exit(1)

def check_git_remote_configured(repo_path):
    try:
        remotes = subprocess.run(["git", "remote", "-v"], cwd=repo_path, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.decode().strip()
        return bool(remotes)
    except subprocess.CalledProcessError:
        return False

def prompt_for_github_repo():
    repo_url = simpledialog.askstring("GitHub Repository", "Please provide the GitHub repository URL:")
    return repo_url

def save_repo_config(repo_url, game):
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as config_file:
            config = json.load(config_file)
    else:
        config = {}
    config[game] = repo_url
    with open(CONFIG_FILE, "w") as config_file:
        json.dump(config, config_file)

def load_repo_config(game):
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as config_file:
            config = json.load(config_file)
            return config.get(game)
    return None

def initialize_git_repo(repo_path, repo_url):
    try:
        if not os.path.exists(os.path.join(repo_path, ".git")):
            subprocess.run(["git", "init"], cwd=repo_path, check=True)
            subprocess.run(["git", "checkout", "-b", "main"], cwd=repo_path, check=True)
        subprocess.run(["git", "remote", "add", "origin", repo_url], cwd=repo_path, check=True)
    except subprocess.CalledProcessError as e:
        messagebox.showerror("Error", f"An error occurred while initializing the git repository: {e}")
        exit(1)

def backup_save_files(repo_path):
    try:
        # Handle untracked files before merge
        subprocess.run(["git", "stash"], cwd=repo_path, check=True)
        subprocess.run(["git", "pull", "origin", "main"], cwd=repo_path, check=True)
        subprocess.run(["git", "stash", "pop"], cwd=repo_path, check=True)
        
        result = subprocess.run(["git", "status", "--porcelain"], cwd=repo_path, check=True, stdout=subprocess.PIPE)
        if not result.stdout:
            messagebox.showinfo("No Changes", "No changes found in save files. No backup needed.")
            return

        subprocess.run(["git", "add", "."], cwd=repo_path, check=True)
        subprocess.run(["git", "commit", "-m", "Backup save files"], cwd=repo_path, check=True)
        subprocess.run(["git", "push", "origin", "main"], cwd=repo_path, check=True)
    except subprocess.CalledProcessError as e:
        messagebox.showerror("Error", f"An error occurred while backing up the save files: {e}")
        exit(1)

    messagebox.showinfo("Success", "Save files backed up successfully!")

def copy_save_files(src, dest):
    if os.path.exists(dest):
        shutil.rmtree(dest)
    shutil.copytree(src, dest, ignore=shutil.ignore_patterns('.git', '.gitignore'))

def backup_game(game, user_id, username):
    check_git_installed()

    try:
        save_files_path = get_save_files_path(game, user_id)
    except Exception as e:
        messagebox.showerror("Error", str(e))
        return

    backup_dir = os.path.join(os.path.expanduser("~/documents"), f"bonfire-{game.replace(' ', '-').lower()}")
    copy_save_files(save_files_path, backup_dir)

    repo_url = load_repo_config(game)

    if not repo_url:
        repo_url = prompt_for_github_repo()
        save_repo_config(repo_url, game)

    if not check_git_remote_configured(backup_dir):
        initialize_git_repo(backup_dir, repo_url)

    backup_save_files(backup_dir)

def create_main_frame(root):
    for widget in root.winfo_children():
        widget.destroy()

    canvas = tk.Canvas(root, bg="black")
    canvas.pack(fill="both", expand=True)

    frame = tk.Frame(canvas, bg="black")
    frame.place(relx=0.5, rely=0.5, anchor="center")

    title_label = tk.Label(frame, text="Bonfire Backup", bg="black", fg="gold", font=("Arial", 24, "bold"))
    title_label.pack(pady=20)

    user_ids = get_steam_user_ids()
    user_buttons = []

    for user_id in user_ids:
        try:
            username = find_username(user_id)
        except Exception as e:
            username = f"User ID {user_id}"

        user_button = tk.Button(frame, text=username, command=lambda uid=user_id, uname=username: create_game_buttons(root, uid, uname), font=("Arial", 14, "bold"), bg="darkred", fg="white", activebackground="red", activeforeground="white")
        user_button.pack(pady=10, fill="x")
        user_buttons.append(user_button)

    root.bind("<Configure>", lambda event, c=canvas: on_resize(c, event))

def create_game_buttons(root, user_id, username):
    for widget in root.winfo_children():
        widget.destroy()

    canvas = tk.Canvas(root, bg="black")
    canvas.pack(fill="both", expand=True)

    frame = tk.Frame(canvas, bg="black")
    frame.place(relx=0.5, rely=0.5, anchor="center")

    tk.Label(frame, text=f"Select a game to backup for {username}:", bg="black", fg="white", font=("Arial", 18, "bold")).pack(pady=20)

    for game in GAME_PATHS.keys():
        button = tk.Button(frame, text=game, command=lambda g=game: backup_game(g, user_id, username), font=("Arial", 14, "bold"), bg="darkred", fg="white", activebackground="red", activeforeground="white")
        button.pack(pady=10, fill="x")

    back_button = tk.Button(frame, text="Back", command=lambda: create_main_frame(root), font=("Arial", 14, "bold"), bg="darkred", fg="white", activebackground="red", activeforeground="white")
    back_button.pack(pady=10, fill="x")

def on_resize(canvas, event):
    canvas.config(width=event.width, height=event.height)

def create_gui():
    root = tk.Tk()
    root.title("Bonfire Backup")
    root.geometry("800x600")
    root.configure(bg="black")

    create_main_frame(root)

    root.mainloop()

if __name__ == "__main__":
    create_gui()
