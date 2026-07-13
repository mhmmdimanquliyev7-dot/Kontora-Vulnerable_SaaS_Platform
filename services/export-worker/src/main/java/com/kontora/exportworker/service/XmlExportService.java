package com.kontora.exportworker.service;

import com.kontora.exportworker.dto.InvoiceDto;
import com.kontora.exportworker.dto.InvoiceExportRequest;
import com.kontora.exportworker.dto.LineItemDto;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

@Service
public class XmlExportService {

    // Built via the DOM API rather than string concatenation specifically so
    // every text node (invoice notes, client names, ...) goes through the
    // DOM's own escaping — a hand-built "<Notes>" + notes + "</Notes>"
    // string would let a value containing "<" or "&" corrupt the document.
    public byte[] toXml(InvoiceExportRequest request) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        // Hardened even though this service only ever builds XML (never
        // parses untrusted XML input): disabling external entities/DTDs is
        // cheap insurance against XXE if a future change adds an XML-parsing
        // path here.
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");

        DocumentBuilder builder = factory.newDocumentBuilder();
        Document doc = builder.newDocument();

        Element root = doc.createElement("InvoiceExport");
        root.setAttribute("generatedAt", Instant.now().toString());
        doc.appendChild(root);

        Element company = doc.createElement("Company");
        company.setAttribute("id", request.company().id());
        appendText(doc, company, "Name", request.company().name());
        if (request.company().address() != null) {
            appendText(doc, company, "Address", request.company().address());
        }
        root.appendChild(company);

        Element invoicesEl = doc.createElement("Invoices");
        root.appendChild(invoicesEl);

        for (InvoiceDto invoice : request.invoices()) {
            invoicesEl.appendChild(buildInvoiceElement(doc, invoice));
        }

        return serialize(doc);
    }

    private Element buildInvoiceElement(Document doc, InvoiceDto invoice) {
        Element invoiceEl = doc.createElement("Invoice");
        invoiceEl.setAttribute("id", invoice.id());
        invoiceEl.setAttribute("number", invoice.number());
        invoiceEl.setAttribute("status", invoice.status());
        invoiceEl.setAttribute("currency", invoice.currency());

        appendText(doc, invoiceEl, "IssueDate", invoice.issueDate());
        appendText(doc, invoiceEl, "DueDate", invoice.dueDate());

        Element client = doc.createElement("Client");
        client.setAttribute("id", invoice.client().id());
        appendText(doc, client, "Name", invoice.client().name());
        if (invoice.client().email() != null) {
            appendText(doc, client, "Email", invoice.client().email());
        }
        invoiceEl.appendChild(client);

        Element lineItems = doc.createElement("LineItems");
        for (LineItemDto item : invoice.items()) {
            Element lineItem = doc.createElement("LineItem");
            appendText(doc, lineItem, "Description", item.description());
            appendText(doc, lineItem, "Quantity", item.quantity().toPlainString());
            appendText(doc, lineItem, "UnitPrice", item.unitPrice().toPlainString());
            appendText(doc, lineItem, "Amount", item.amount().toPlainString());
            lineItems.appendChild(lineItem);
        }
        invoiceEl.appendChild(lineItems);

        Element totals = doc.createElement("Totals");
        totals.setAttribute("subtotal", invoice.subtotal().toPlainString());
        totals.setAttribute("tax", invoice.tax().toPlainString());
        totals.setAttribute("total", invoice.total().toPlainString());
        invoiceEl.appendChild(totals);

        if (invoice.notes() != null && !invoice.notes().isBlank()) {
            appendText(doc, invoiceEl, "Notes", invoice.notes());
        }

        return invoiceEl;
    }

    private void appendText(Document doc, Element parent, String tag, String value) {
        Element el = doc.createElement(tag);
        el.setTextContent(value);
        parent.appendChild(el);
    }

    private byte[] serialize(Document doc) throws Exception {
        TransformerFactory tf = TransformerFactory.newInstance();
        tf.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        tf.setAttribute(XMLConstants.ACCESS_EXTERNAL_STYLESHEET, "");
        Transformer transformer = tf.newTransformer();
        transformer.setOutputProperty(OutputKeys.INDENT, "yes");
        transformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount", "2");
        transformer.setOutputProperty(OutputKeys.ENCODING, "UTF-8");

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        transformer.transform(new DOMSource(doc), new StreamResult(out));
        return out.toByteArray();
    }
}
