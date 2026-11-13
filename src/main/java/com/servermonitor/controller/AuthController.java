package com.servermonitor.controller;

import com.servermonitor.dto.ApiResponse;
import com.servermonitor.dto.LoginRequest;
import com.servermonitor.dto.LoginResponse;
import com.servermonitor.entity.Admin;
import com.servermonitor.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.authenticate(request);
        if (response.isAuthenticated()) {
            return ResponseEntity.ok(ApiResponse.ok("Login successful", response));
        } else {
            return ResponseEntity.status(401).body(ApiResponse.error(response.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            authService.logout(token);
        }
        return ResponseEntity.ok(ApiResponse.ok("Logged out successfully", null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Admin>> getCurrentUser(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            Admin admin = authService.getAdminByToken(token);
            if (admin != null) {
                return ResponseEntity.ok(ApiResponse.ok("Admin profile retrieved", admin));
            }
        }
        return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized or session expired"));
    }
}
