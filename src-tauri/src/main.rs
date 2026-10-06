#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use midir::{Ignore, MidiInput, MidiInputConnection};
use serde::Serialize;
use std::{fs, path::PathBuf, sync::Mutex};
use tauri::{Emitter, Manager, State};

#[derive(Clone, Serialize)]
struct MidiMsg { kind: String, note: u8, vel: u8 }

struct Conn(Mutex<Option<MidiInputConnection<()>>>);

fn input() -> Result<MidiInput, String> {
    let mut m = MidiInput::new("piano-course").map_err(|e| e.to_string())?;
    m.ignore(Ignore::None);
    Ok(m)
}

#[tauri::command]
fn list_ports() -> Result<Vec<String>, String> {
    let m = input()?;
    Ok(m.ports().iter().filter_map(|p| m.port_name(p).ok()).collect())
}

#[tauri::command]
fn connect(app: tauri::AppHandle, state: State<Conn>, index: usize) -> Result<String, String> {
    let m = input()?;
    let ports = m.ports();
    let port = ports.get(index).ok_or("porta non trovata")?;
    let name = m.port_name(port).map_err(|e| e.to_string())?;
    let handle = app.clone();
    let conn = m
        .connect(
            port,
            "piano-course-in",
            move |_, msg, _| {
                if msg.len() >= 3 {
                    let (st, note, vel) = (msg[0] & 0xF0, msg[1], msg[2]);
                    let kind = if st == 0x90 && vel > 0 { "on" } else if st == 0x80 || st == 0x90 { "off" } else { return };
                    let _ = handle.emit("midi", MidiMsg { kind: kind.into(), note, vel });
                }
            },
            (),
        )
        .map_err(|e| e.to_string())?;
    *state.0.lock().unwrap() = Some(conn);
    Ok(name)
}

fn pfile(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let d = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    Ok(d.join("progress.json"))
}

#[tauri::command]
fn load_progress(app: tauri::AppHandle) -> Result<String, String> {
    Ok(fs::read_to_string(pfile(&app)?).unwrap_or_else(|_| "{}".into()))
}

#[tauri::command]
fn save_progress(app: tauri::AppHandle, data: String) -> Result<(), String> {
    fs::write(pfile(&app)?, data).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .manage(Conn(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![list_ports, connect, load_progress, save_progress])
        .run(tauri::generate_context!())
        .expect("errore avvio app");
}
