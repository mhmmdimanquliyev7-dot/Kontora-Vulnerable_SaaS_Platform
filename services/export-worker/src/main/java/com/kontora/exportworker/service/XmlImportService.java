package com.kontora.exportworker.service;

import com.kontora.exportworker.dto.ParsedClientDto;
import com.kontora.exportworker.dto.XmlImportError;
import com.kontora.exportworker.dto.XmlImportResult;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

/**
 * Parses an uploaded client-import XML document. This is the counterpart to
 * the XML EXPORT this service already does, and the reason it lives here (Java)
 * rather than in the Node API: parsing untrusted XML is the canonical XXE
 * surface, and this parser is hardened against it explicitly.
 *
 * <p>The hardening is the point of the feature. disallow-doctype-decl = true
 * means any document containing a DOCTYPE — the vehicle for every classic XXE
 * payload (external entities reading /etc/passwd, SSRF via SYSTEM URLs, billion
 * laughs) — is rejected outright before a single entity is expanded. External
 * general/parameter entities and XInclude are disabled belt-and-braces, and
 * ACCESS_EXTERNAL_DTD is emptied so no external DTD can be fetched.
 *
 * <p>Parse-only: it returns validated rows and never touches a database.
 */
@Service
public class XmlImportService {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final int MAX_NAME_LENGTH = 200;

    public XmlImportResult parseClients(InputStream xml) throws Exception {
        Document doc = parseHardened(xml);
        doc.getDocumentElement().normalize();

        List<ParsedClientDto> valid = new ArrayList<>();
        List<XmlImportError> errors = new ArrayList<>();

        NodeList clientNodes = doc.getElementsByTagName("Client");
        for (int i = 0; i < clientNodes.getLength(); i++) {
            int index = i + 1;
            Node node = clientNodes.item(i);
            if (node.getNodeType() != Node.ELEMENT_NODE) {
                continue;
            }
            Element el = (Element) node;

            String name = childText(el, "Name");
            if (name.isBlank()) {
                errors.add(new XmlImportError(index, "Missing required <Name> element."));
                continue;
            }
            if (name.length() > MAX_NAME_LENGTH) {
                errors.add(new XmlImportError(index, "Name exceeds " + MAX_NAME_LENGTH + " characters."));
                continue;
            }

            String email = childText(el, "Email");
            if (!email.isBlank() && !EMAIL.matcher(email).matches()) {
                errors.add(new XmlImportError(index, "Invalid email: " + email));
                continue;
            }

            String phone = childText(el, "Phone");
            String billingAddress = childText(el, "BillingAddress");

            valid.add(new ParsedClientDto(
                    name,
                    email.isBlank() ? null : email,
                    phone.isBlank() ? null : phone,
                    billingAddress.isBlank() ? null : billingAddress));
        }

        return new XmlImportResult(valid, errors, valid.size(), errors.size());
    }

    private Document parseHardened(InputStream xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        // The single most important line: reject any document with a DOCTYPE,
        // which is what every XXE payload needs to declare an entity.
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        factory.setNamespaceAware(false);
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");

        DocumentBuilder builder = factory.newDocumentBuilder();
        return builder.parse(xml);
    }

    private String childText(Element parent, String tag) {
        NodeList list = parent.getElementsByTagName(tag);
        if (list.getLength() == 0) {
            return "";
        }
        String text = list.item(0).getTextContent();
        return text == null ? "" : text.trim();
    }
}
