package com.servermonitor.dto;

public class LoginResponse {
    private boolean authenticated;
    private String token;
    private String username;
    private String fullName;
    private String role;
    private String message;

    public LoginResponse() {
    }

    public LoginResponse(boolean authenticated, String token, String username, String fullName, String role, String message) {
        this.authenticated = authenticated;
        this.token = token;
        this.username = username;
        this.fullName = fullName;
        this.role = role;
        this.message = message;
    }

    public boolean isAuthenticated() {
        return authenticated;
    }

    public void setAuthenticated(boolean authenticated) {
        this.authenticated = authenticated;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
