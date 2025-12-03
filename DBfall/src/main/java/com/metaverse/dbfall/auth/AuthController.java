package com.metaverse.dbfall.auth;

import com.metaverse.dbfall.auth.dto.AuthResponse;
import com.metaverse.dbfall.auth.dto.LoginRequest;
import com.metaverse.dbfall.auth.dto.RegisterRequest;
import com.metaverse.dbfall.user.User;
import com.metaverse.dbfall.user.UserService;
import com.metaverse.dbfall.user.dto.UserDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserService userService;
    private final AuthService authService;

    public AuthController(UserService userService, AuthService authService) {
        this.userService = userService;
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        try {
            LocalDate birth = null;
            if (req.birthDate != null && !req.birthDate.isBlank()) birth = LocalDate.parse(req.birthDate);
            User user = userService.register(req.username, req.password, birth);
            AuthResponse res = authService.buildAuth(user);
            return ResponseEntity.status(HttpStatus.CREATED).body(res);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("username already exists");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        return userService.findByUsername(req.username)
                .filter(u -> userService.checkPassword(u, req.password))
                .<ResponseEntity<?>>map(u -> ResponseEntity.ok(authService.buildAuth(u)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("invalid credentials"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String username = authentication.getName();
        return userService.findByUsername(username)
                .<ResponseEntity<?>>map(u -> ResponseEntity.ok(UserDto.from(u)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }
}
