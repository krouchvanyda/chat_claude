package com.chatapp.controller;

import com.chatapp.model.User;
import com.chatapp.repository.UserRepository;
import com.chatapp.service.FileStorageService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/** Mirrors {@code routes/userRoutes.js}. */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    public UserController(UserRepository userRepository, FileStorageService fileStorageService) {
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
    }

    // GET /api/users/:phone
    @GetMapping("/{phone}")
    public ResponseEntity<?> getByPhone(@PathVariable String phone, HttpServletRequest request) {
        Optional<User> userOpt = userRepository.findByPhone(phone);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
        }
        User user = userOpt.get();

        // Relative image -> full URL, e.g. http://host/uploads/xyz.png
        String profileImageUrl = (user.getProfileImage() != null)
                ? request.getScheme() + "://" + request.getHeader("host") + user.getProfileImage()
                : null;

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("_id", user.getId());
        body.put("phone", user.getPhone());
        body.put("name", user.getName());
        body.put("profileImage", profileImageUrl);
        return ResponseEntity.ok(body);
    }

    // POST /api/users  (multipart/form-data, field "profileImage")
    @PostMapping
    public ResponseEntity<?> create(
            @RequestParam("phone") String phone,
            @RequestParam(value = "name", required = false) String name,
            @RequestPart(value = "profileImage", required = false) MultipartFile profileImage) {

        if (userRepository.findByPhone(phone).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "User already exists!"));
        }

        String imagePath = (profileImage != null && !profileImage.isEmpty())
                ? fileStorageService.store(profileImage)
                : null;

        User user = new User();
        user.setPhone(phone);
        user.setName(name);
        user.setProfileImage(imagePath);
        user = userRepository.save(user);

        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    // PUT /api/users/:id  (multipart/form-data, field "profileImage")
    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestParam(value = "name", required = false) String name,
            @RequestPart(value = "profileImage", required = false) MultipartFile profileImage) {

        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
        }
        User user = userOpt.get();

        if (profileImage != null && !profileImage.isEmpty()) {
            if (user.getProfileImage() != null) {
                fileStorageService.delete(user.getProfileImage());
            }
            user.setProfileImage(fileStorageService.store(profileImage));
        }

        if (name != null) {
            user.setName(name);
        }

        user = userRepository.save(user);
        return ResponseEntity.ok(user);
    }
}
