import { create } from 'xmlbuilder2';

export function wantsXml(req) {
    return (req.headers.accept || '').includes('application/xml');
}

export function orderToXml(order, items, buyer, sellers) {
    const preDiscountTotal = Math.round(
        items.reduce((sum, { price, quantity }) => sum + price * quantity, 0) * 100
    ) / 100;
    const finalTotal = parseFloat(order.total_price ?? preDiscountTotal);
    const saved = Math.round((preDiscountTotal - finalTotal) * 100) / 100;

    const issueDate = new Date(order.created_at);
    const issueDateStr = issueDate.toISOString().split('T')[0];
    const issueTimeStr = issueDate.toISOString().split('T')[1].replace(/\.\d+Z$/, '');

    const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('Order', {
            'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Order-2',
            'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
            'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
        });

    root.ele('cbc:UBLVersionID').txt('2.1');
    root.ele('cbc:ID').txt(String(order.id));
    root.ele('cbc:IssueDate').txt(issueDateStr);
    root.ele('cbc:IssueTime').txt(issueTimeStr);
    root.ele('cbc:DocumentCurrencyCode').txt('AUD');
    root.ele('cbc:Note').txt(`Status: ${order.status}`);

    const buyerParty = root.ele('cac:BuyerCustomerParty').ele('cac:Party');
    buyerParty.ele('cac:PartyName').ele('cbc:Name').txt(buyer?.name ?? '');
    const buyerAddr = buyerParty.ele('cac:PostalAddress');
    if (buyer?.street) buyerAddr.ele('cbc:StreetName').txt(buyer.street);
    if (buyer?.city) buyerAddr.ele('cbc:CityName').txt(buyer.city);
    if (buyer?.postcode) buyerAddr.ele('cbc:PostalZone').txt(buyer.postcode);
    if (buyer?.country) buyerAddr.ele('cac:Country').ele('cbc:IdentificationCode').txt(buyer.country);

    for (const seller of (sellers || [])) {
        const sellerParty = root.ele('cac:SellerSupplierParty').ele('cac:Party');
        sellerParty.ele('cac:PartyIdentification').ele('cbc:ID').txt(String(seller.id));
        sellerParty.ele('cac:PartyName').ele('cbc:Name').txt(seller.name ?? '');
        const sellerAddr = sellerParty.ele('cac:PostalAddress');
        if (seller.street) sellerAddr.ele('cbc:StreetName').txt(seller.street);
        if (seller.city) sellerAddr.ele('cbc:CityName').txt(seller.city);
        if (seller.postcode) sellerAddr.ele('cbc:PostalZone').txt(seller.postcode);
        if (seller.country) sellerAddr.ele('cac:Country').ele('cbc:IdentificationCode').txt(seller.country);
    }

    items.forEach((item, index) => {
        const lineExt = Math.round(item.price * item.quantity * 100) / 100;
        const line = root.ele('cac:OrderLine');
        const lineItem = line.ele('cac:LineItem');
        lineItem.ele('cbc:ID').txt(String(index + 1));
        lineItem.ele('cbc:Quantity', { unitCode: 'C62' }).txt(String(item.quantity));
        lineItem.ele('cbc:LineExtensionAmount', { currencyID: 'AUD' }).txt(String(lineExt));
        lineItem.ele('cac:Price').ele('cbc:PriceAmount', { currencyID: 'AUD' }).txt(String(item.price));
        const itemEle = lineItem.ele('cac:Item');
        itemEle.ele('cbc:Name').txt(item.product_name ?? '');
        itemEle.ele('cac:SellersItemIdentification').ele('cbc:ID').txt(String(item.product_id));
    });

    const totals = root.ele('cac:AnticipatedMonetaryTotal');
    totals.ele('cbc:LineExtensionAmount', { currencyID: 'AUD' }).txt(String(preDiscountTotal));
    if (saved > 0) totals.ele('cbc:AllowanceTotalAmount', { currencyID: 'AUD' }).txt(String(saved));
    totals.ele('cbc:PayableAmount', { currencyID: 'AUD' }).txt(String(finalTotal));

    return root.end({ prettyPrint: true });
}

export function orderResponseToXml(response, order, items, buyer, seller) {
    const issueDate = new Date(response.created_at);
    const issueDateStr = issueDate.toISOString().split('T')[0];
    const issueTimeStr = issueDate.toISOString().split('T')[1].replace(/\.\d+Z$/, '');

    const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('OrderResponse', {
            'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:OrderResponse-2',
            'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
            'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
        });

    root.ele('cbc:UBLVersionID').txt('2.1');
    root.ele('cbc:ID').txt(String(response.id));
    root.ele('cbc:IssueDate').txt(issueDateStr);
    root.ele('cbc:IssueTime').txt(issueTimeStr);
    root.ele('cbc:OrderCommunicationTypeCode').txt(response.response_code);
    if (response.note) root.ele('cbc:Note').txt(response.note);

    root.ele('cac:OrderReference').ele('cbc:ID').txt(String(order.id));

    const sellerParty = root.ele('cac:SellerSupplierParty').ele('cac:Party');
    sellerParty.ele('cac:PartyIdentification').ele('cbc:ID').txt(String(seller.id));
    sellerParty.ele('cac:PartyName').ele('cbc:Name').txt(seller.name ?? '');
    const sellerAddr = sellerParty.ele('cac:PostalAddress');
    if (seller.street) sellerAddr.ele('cbc:StreetName').txt(seller.street);
    if (seller.city) sellerAddr.ele('cbc:CityName').txt(seller.city);
    if (seller.postcode) sellerAddr.ele('cbc:PostalZone').txt(seller.postcode);
    if (seller.country) sellerAddr.ele('cac:Country').ele('cbc:IdentificationCode').txt(seller.country);

    const buyerParty = root.ele('cac:BuyerCustomerParty').ele('cac:Party');
    buyerParty.ele('cac:PartyName').ele('cbc:Name').txt(buyer?.name ?? '');
    const buyerAddr = buyerParty.ele('cac:PostalAddress');
    if (buyer?.street) buyerAddr.ele('cbc:StreetName').txt(buyer.street);
    if (buyer?.city) buyerAddr.ele('cbc:CityName').txt(buyer.city);
    if (buyer?.postcode) buyerAddr.ele('cbc:PostalZone').txt(buyer.postcode);
    if (buyer?.country) buyerAddr.ele('cac:Country').ele('cbc:IdentificationCode').txt(buyer.country);

    items.forEach((item, index) => {
        const lineExt = Math.round(item.price * item.quantity * 100) / 100;
        const line = root.ele('cac:OrderLine');
        const lineItem = line.ele('cac:LineItem');
        lineItem.ele('cbc:ID').txt(String(index + 1));
        lineItem.ele('cbc:Quantity', { unitCode: 'C62' }).txt(String(item.quantity));
        lineItem.ele('cbc:LineExtensionAmount', { currencyID: 'AUD' }).txt(String(lineExt));
        lineItem.ele('cac:Price').ele('cbc:PriceAmount', { currencyID: 'AUD' }).txt(String(item.price));
        const itemEle = lineItem.ele('cac:Item');
        itemEle.ele('cbc:Name').txt(item.product_name ?? '');
        itemEle.ele('cac:SellersItemIdentification').ele('cbc:ID').txt(String(item.product_id));
    });

    return root.end({ prettyPrint: true });
}

export function orderCancellationToXml(cancellation, order, buyer, sellers) {
    const issueDate = new Date(cancellation.created_at);
    const issueDateStr = issueDate.toISOString().split('T')[0];
    const issueTimeStr = issueDate.toISOString().split('T')[1].replace(/\.\d+Z$/, '');

    const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('OrderCancellation', {
            'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:OrderCancellation-2',
            'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
            'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
        });

    root.ele('cbc:UBLVersionID').txt('2.1');
    root.ele('cbc:ID').txt(String(cancellation.id));
    root.ele('cbc:IssueDate').txt(issueDateStr);
    root.ele('cbc:IssueTime').txt(issueTimeStr);
    if (cancellation.reason) root.ele('cbc:Note').txt(cancellation.reason);

    root.ele('cac:OrderReference').ele('cbc:ID').txt(String(order.id));

    const buyerParty = root.ele('cac:BuyerCustomerParty').ele('cac:Party');
    buyerParty.ele('cac:PartyName').ele('cbc:Name').txt(buyer?.name ?? '');
    const buyerAddr = buyerParty.ele('cac:PostalAddress');
    if (buyer?.street) buyerAddr.ele('cbc:StreetName').txt(buyer.street);
    if (buyer?.city) buyerAddr.ele('cbc:CityName').txt(buyer.city);
    if (buyer?.postcode) buyerAddr.ele('cbc:PostalZone').txt(buyer.postcode);
    if (buyer?.country) buyerAddr.ele('cac:Country').ele('cbc:IdentificationCode').txt(buyer.country);

    for (const seller of (sellers || [])) {
        const sellerParty = root.ele('cac:SellerSupplierParty').ele('cac:Party');
        sellerParty.ele('cac:PartyIdentification').ele('cbc:ID').txt(String(seller.id));
        sellerParty.ele('cac:PartyName').ele('cbc:Name').txt(seller.name ?? '');
        const sellerAddr = sellerParty.ele('cac:PostalAddress');
        if (seller.street) sellerAddr.ele('cbc:StreetName').txt(seller.street);
        if (seller.city) sellerAddr.ele('cbc:CityName').txt(seller.city);
        if (seller.postcode) sellerAddr.ele('cbc:PostalZone').txt(seller.postcode);
        if (seller.country) sellerAddr.ele('cac:Country').ele('cbc:IdentificationCode').txt(seller.country);
    }

    return root.end({ prettyPrint: true });
}
