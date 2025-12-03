package com.metaverse.dbfall.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Objects;

@Component
public class JwtTokenProvider {

    @Value("${app.jwt-secret}")
    private String secret;

    @Value("${app.jwt-expiration-ms:86400000}")
    private long expirationMs;

    public String generateToken(Long userId, String username) {
        long now = System.currentTimeMillis();
        long exp = now + expirationMs;
        String headerJson = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String payloadJson = "{\"sub\":\"" + escapeJson(username) + "\",\"uid\":" + userId + ",\"exp\":" + exp + "}";
        String header = base64UrlEncode(headerJson.getBytes(StandardCharsets.UTF_8));
        String payload = base64UrlEncode(payloadJson.getBytes(StandardCharsets.UTF_8));
        String signature = sign(header + "." + payload);
        return header + "." + payload + "." + signature;
    }

    public boolean validate(String token) {
        if (token == null || token.isEmpty()) return false;
        String[] parts = token.split("\\.");
        if (parts.length != 3) return false;
        String header = parts[0];
        String payload = parts[1];
        String signature = parts[2];
        String expected = sign(header + "." + payload);
        if (!Objects.equals(signature, expected)) return false;
        // check exp (milliseconds since epoch)
        String payloadJson = new String(Base64.getUrlDecoder().decode(payload), StandardCharsets.UTF_8);
        Long exp = extractNumericField(payloadJson, "exp");
        return exp != null && exp > Instant.now().toEpochMilli();
    }

    public Long getUserId(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) return null;
            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            Long uid = extractNumericField(payloadJson, "uid");
            if (uid != null) return uid;
        } catch (Exception ignored) {}
        return null;
    }

    public String getUsername(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) return null;
            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            return extractStringField(payloadJson, "sub");
        } catch (Exception ignored) {}
        return null;
    }

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return base64UrlEncode(raw);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to sign JWT", e);
        }
    }

    private String base64UrlEncode(byte[] b) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    private Long extractNumericField(String json, String field) {
        String key = "\"" + field + "\"";
        int idx = json.indexOf(key);
        if (idx == -1) return null;
        idx = json.indexOf(":", idx);
        if (idx == -1) return null;
        int start = idx + 1;
        while (start < json.length() && Character.isWhitespace(json.charAt(start))) start++;
        int end = start;
        while (end < json.length() && (Character.isDigit(json.charAt(end)))) end++;
        if (end > start) {
            try { return Long.parseLong(json.substring(start, end)); } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    private String extractStringField(String json, String field) {
        String key = "\"" + field + "\"";
        int idx = json.indexOf(key);
        if (idx == -1) return null;
        idx = json.indexOf(":", idx);
        if (idx == -1) return null;
        int start = idx + 1;
        while (start < json.length() && Character.isWhitespace(json.charAt(start))) start++;
        if (start >= json.length() || json.charAt(start) != '"') return null;
        start++;
        int end = start;
        while (end < json.length() && json.charAt(end) != '"') end++;
        if (end > start && end < json.length()) return json.substring(start, end);
        return null;
    }

    private String escapeJson(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
