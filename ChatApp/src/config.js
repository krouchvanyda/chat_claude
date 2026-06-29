/**
 * Backend connection config.
 *
 * The Java/Spring Boot backend (see BACKEND.md) exposes:
 *   - REST API     on SERVER_PORT   (default 5001)
 *   - Socket.IO    on SOCKETIO_PORT (default 5002)
 *
 * Set HOST to the machine running the backend, reachable from the device:
 *   - Android emulator -> host loopback is 10.0.2.2
 *   - iOS simulator    -> localhost / 127.0.0.1
 *   - Physical device  -> your computer's LAN IP (e.g. 192.168.x.x), same Wi-Fi
 */
// Physical Android device: your computer's LAN IP (phone on the same Wi-Fi/network).
const HOST = '172.20.17.31';

export const API_URL = `http://${HOST}:5001/api`;
export const SOCKET_URL = `http://${HOST}:5002`;
