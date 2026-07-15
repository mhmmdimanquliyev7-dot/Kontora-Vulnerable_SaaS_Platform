package com.kontora.exportworker.controller;

import com.kontora.exportworker.dto.XmlImportResult;
import com.kontora.exportworker.service.XmlImportService;
import java.io.InputStream;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class ImportController {

    private final XmlImportService xmlImportService;

    public ImportController(XmlImportService xmlImportService) {
        this.xmlImportService = xmlImportService;
    }

    // Parses an uploaded client-import XML file. A malformed document (or one
    // containing a DOCTYPE — see XmlImportService) fails parsing and is
    // returned as a 422, not a 500: it's the caller's file that's bad, not the
    // service. Any successfully-parsed content comes back as validated rows +
    // per-row errors for the API to write.
    @PostMapping(value = "/import/xml", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> importXml(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.unprocessableEntity()
                    .body("{\"error\":\"ValidationError\",\"message\":\"An XML file is required.\"}");
        }
        try (InputStream in = file.getInputStream()) {
            XmlImportResult result = xmlImportService.parseClients(in);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.unprocessableEntity()
                    .body("{\"error\":\"ValidationError\",\"message\":\"Could not parse the uploaded file as valid import XML.\"}");
        }
    }
}
