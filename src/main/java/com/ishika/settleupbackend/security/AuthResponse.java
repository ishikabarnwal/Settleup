package com.ishika.settleupbackend.security;

import com.ishika.settleupbackend.user.UserResponse;
import java.time.Instant;

public record AuthResponse(String token, String tokenType, Instant expiresAt, UserResponse user) {

    public static AuthResponse of(JwtService.IssuedToken token, UserResponse user) {
        return new AuthResponse(token.value(), "Bearer", token.expiresAt(), user);
    }
}
