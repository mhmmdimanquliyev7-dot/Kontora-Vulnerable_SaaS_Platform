package com.kontora.exportworker.service;

import com.kontora.exportworker.dto.ParsedInvoiceDto;
import java.io.InputStream;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;

/**
 * Chapter 18 — XXE lab (INTENTIONAL, training only, INTENTIONALLY
 * VULNERABLE). Parses an uploaded/pasted "Import invoice from XML" document
 * (a UBL-style e-invoice: {@code <Invoice><ID>}, {@code <IssueDate>},
 * {@code <DueDate>}, {@code <DocumentCurrencyCode>}, a nested customer
 * {@code <PartyName><Name>}, {@code <LegalMonetaryTotal><PayableAmount>},
 * and {@code <Note>}).
 *
 * <p>Unlike {@link XmlImportService} (the hardened client importer above),
 * this parser applies NO hardening at all: {@code DocumentBuilderFactory
 * .newInstance()} is used exactly as-is — no {@code disallow-doctype-decl},
 * no {@code external-general-entities}/{@code external-parameter-entities}
 * toggles, no {@code ACCESS_EXTERNAL_DTD} restriction, no
 * {@code FEATURE_SECURE_PROCESSING}. Every JAXP/Xerces default therefore
 * stays on: DOCTYPE declarations are allowed, external general AND
 * parameter entities are resolved, external DTDs are fetched over the
 * network, and XInclude (where a document opts into it) is honored. That
 * default behavior is exactly what makes Java's XML parsers XXE-vulnerable
 * out of the box — every real hardening guide (OWASP included) calls out
 * that you must explicitly opt OUT of it, and this class deliberately never
 * does.
 *
 * <p>Every parsed field is echoed back verbatim in {@link ParsedInvoiceDto}
 * (in-band file-read via a general entity resolves here); a SYSTEM
 * identifier pointing at an internal host is fetched over this container's
 * real network access (XXE -> SSRF, e.g. {@code http://mailhog:8025/}); an
 * external DTD referenced from the DOCTYPE is fetched the same way
 * (out-of-band exfil to an attacker-controlled host). Parse failures are
 * NOT swallowed here — the caller (InvoiceImportController) returns the raw
 * exception message, which is what makes error-based exfil visible too.
 */
@Service
public class XmlInvoiceImportService {

    public ParsedInvoiceDto parseInvoice(InputStream xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        // No .setFeature(...) calls. No ACCESS_EXTERNAL_DTD/SCHEMA
        // restriction. No FEATURE_SECURE_PROCESSING. Every default is left
        // exactly as JAXP ships it — see the class comment above.
        DocumentBuilder builder = factory.newDocumentBuilder();
        Document doc = builder.parse(xml);
        doc.getDocumentElement().normalize();

        String number = firstElementText(doc, "ID");
        String issueDate = firstElementText(doc, "IssueDate");
        String dueDate = firstElementText(doc, "DueDate");
        String currency = firstElementText(doc, "DocumentCurrencyCode");
        String clientName = firstElementText(doc, "Name");
        String total = firstElementText(doc, "PayableAmount");
        String notes = firstElementText(doc, "Note");

        return new ParsedInvoiceDto(number, clientName, issueDate, dueDate, currency, total, notes);
    }

    private String firstElementText(Document doc, String tag) {
        NodeList list = doc.getElementsByTagName(tag);
        if (list.getLength() == 0) {
            return null;
        }
        String text = list.item(0).getTextContent();
        return (text == null || text.isBlank()) ? null : text.trim();
    }
}
