package com.metaverse.dbfall.auth;

import com.metaverse.dbfall.auth.dto.AuthResponse;
import com.metaverse.dbfall.user.User;
import com.metaverse.dbfall.user.UserService;
import com.metaverse.dbfall.user.dto.UserDto;
import com.metaverse.dbfall.security.JwtTokenProvider;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserService userService;
    private final JwtTokenProvider tokenProvider;

    public AuthService(UserService userService, JwtTokenProvider tokenProvider) {
        this.userService = userService;
        this.tokenProvider = tokenProvider;
    }

    public AuthResponse buildAuth(User user) {
        AuthResponse res = new AuthResponse();
        res.token = tokenProvider.generateToken(user.getId(), user.getUsername());
        res.user = UserDto.from(user);
        return res;
    }
}
