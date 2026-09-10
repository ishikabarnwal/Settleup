package com.ishika.settleupbackend.security;

import com.ishika.settleupbackend.exception.NotFoundException;
import com.ishika.settleupbackend.user.User;
import com.ishika.settleupbackend.user.UserRepository;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * Resolves the caller behind the bearer token so services don't have to poke at
 * the security context themselves.
 */
@Component
public class CurrentUser {

    private final UserRepository userRepository;

    public CurrentUser(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User require() {
        return userRepository.findById(requireId())
                .orElseThrow(() -> new NotFoundException("The signed in user no longer exists"));
    }

    public Long requireId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new AuthenticationCredentialsNotFoundException("No authenticated user on this request");
        }

        try {
            return Long.valueOf(jwt.getSubject());
        } catch (NumberFormatException ex) {
            throw new AuthenticationCredentialsNotFoundException("Token subject is not a user id");
        }
    }
}
