package com.ishika.settleupbackend.group;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AddMemberRequest(
        @NotBlank(message = "email is required")
        @Email(message = "email must be a valid address")
        String email) {}
