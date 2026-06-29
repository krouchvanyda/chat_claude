package com.chatapp.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Replaces {@code app.get("/", (req, res) => res.send("Hello"))}. */
@RestController
public class RootController {

    @GetMapping("/")
    public String hello() {
        return "Hello";
    }
}
