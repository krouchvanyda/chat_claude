package com.chatapp.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/**
 * Replaces the Multer disk-storage setup in {@code routes/userRoutes.js}.
 * Files are stored under {@code app.upload-dir} and referenced as {@code /uploads/<filename>}.
 */
@Service
public class FileStorageService {

    private final Path uploadDir;

    public FileStorageService(@Value("${app.upload-dir}") String uploadDir) {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    void init() {
        try {
            Files.createDirectories(uploadDir);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not create upload directory: " + uploadDir, e);
        }
    }

    /**
     * Stores the file using the original Multer naming scheme: {@code <timestamp>-<originalname>}.
     *
     * @return the public relative path, e.g. {@code /uploads/1719400000000-pic.png}
     */
    public String store(MultipartFile file) {
        String original = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
        String filename = System.currentTimeMillis() + "-" + original;
        Path target = uploadDir.resolve(filename).normalize();

        // Guard against path traversal via crafted filenames.
        if (!target.startsWith(uploadDir)) {
            throw new IllegalArgumentException("Invalid file name: " + original);
        }
        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store file " + filename, e);
        }
        return "/uploads/" + filename;
    }

    /**
     * Deletes a previously stored file given its public path ({@code /uploads/<filename>}).
     * Silently ignores files that no longer exist, matching the original {@code fs.existsSync} guard.
     */
    public void delete(String publicPath) {
        if (publicPath == null || publicPath.isBlank()) {
            return;
        }
        String filename = Paths.get(publicPath).getFileName().toString();
        Path target = uploadDir.resolve(filename).normalize();
        if (!target.startsWith(uploadDir)) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to delete file " + filename, e);
        }
    }
}
