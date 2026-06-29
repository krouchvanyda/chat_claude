package com.chatapp.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Mirrors Mongoose {@code models/User.js}, now a JPA entity on the {@code users} table.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "users")
public class User extends AuditableEntity {

    @Pattern(regexp = "^\\+?[1-9]\\d{1,14}$", message = "Please enter a valid phone number")
    @Column(nullable = false, unique = true, length = 32)
    private String phone;

    @Column(length = 255)
    private String name;

    @Column(name = "profile_image", length = 1024)
    private String profileImage;
}
