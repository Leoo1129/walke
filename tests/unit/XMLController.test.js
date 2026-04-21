import { describe, it, expect } from 'vitest';
import { wantsXml, orderToXml, orderResponseToXml, orderCancellationToXml } from '../../src/controllers/XMLController.js';

const ORDER = {
    id: 1,
    status: 'pending',
    total_price: 19.98,
    created_at: new Date('2026-01-15T10:00:00.000Z'),
};

const ITEMS = [
    { product_id: 2, quantity: 2, price: 9.99, product_name: 'Widget', seller_id: 5 },
];

const BUYER = {
    id: 1,
    name: 'Alice',
    street: '1 Main St',
    city: 'Sydney',
    postcode: '2000',
    country: 'AU',
};

const SELLER = {
    id: 5,
    name: 'BobShop',
    street: '42 Shop Rd',
    city: 'Melbourne',
    postcode: '3000',
    country: 'AU',
};

describe('wantsXml', () => {
    it('returns true when Accept header contains application/xml', () => {
        expect(wantsXml({ headers: { accept: 'application/xml' } })).toBe(true);
    });

    it('returns true when Accept header includes application/xml among others', () => {
        expect(wantsXml({ headers: { accept: 'text/html, application/xml' } })).toBe(true);
    });

    it('returns false when Accept header is application/json', () => {
        expect(wantsXml({ headers: { accept: 'application/json' } })).toBe(false);
    });

    it('returns false when no Accept header is present', () => {
        expect(wantsXml({ headers: {} })).toBe(false);
    });
});

describe('orderToXml', () => {
    it('produces valid UBL 2.1 Order XML', () => {
        const xml = orderToXml(ORDER, ITEMS, BUYER, [SELLER]);
        expect(xml).toContain('xmlns="urn:oasis:names:specification:ubl:schema:xsd:Order-2"');
        expect(xml).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
        expect(xml).toContain('<cbc:ID>1</cbc:ID>');
        expect(xml).toContain('<cbc:DocumentCurrencyCode>AUD</cbc:DocumentCurrencyCode>');
    });

    it('includes correct issue date', () => {
        const xml = orderToXml(ORDER, ITEMS, BUYER, [SELLER]);
        expect(xml).toContain('<cbc:IssueDate>2026-01-15</cbc:IssueDate>');
    });

    it('includes order status in Note', () => {
        const xml = orderToXml(ORDER, ITEMS, BUYER, [SELLER]);
        expect(xml).toContain('<cbc:Note>Status: pending</cbc:Note>');
    });

    it('includes buyer party with address', () => {
        const xml = orderToXml(ORDER, ITEMS, BUYER, [SELLER]);
        expect(xml).toContain('<cac:BuyerCustomerParty>');
        expect(xml).toContain('<cbc:Name>Alice</cbc:Name>');
        expect(xml).toContain('<cbc:StreetName>1 Main St</cbc:StreetName>');
        expect(xml).toContain('<cbc:CityName>Sydney</cbc:CityName>');
        expect(xml).toContain('<cbc:PostalZone>2000</cbc:PostalZone>');
    });

    it('includes seller party with address', () => {
        const xml = orderToXml(ORDER, ITEMS, BUYER, [SELLER]);
        expect(xml).toContain('<cac:SellerSupplierParty>');
        expect(xml).toContain('<cbc:Name>BobShop</cbc:Name>');
    });

    it('includes order line with item details', () => {
        const xml = orderToXml(ORDER, ITEMS, BUYER, [SELLER]);
        expect(xml).toContain('<cac:OrderLine>');
        expect(xml).toContain('<cbc:Name>Widget</cbc:Name>');
        expect(xml).toContain('<cbc:Quantity unitCode="C62">2</cbc:Quantity>');
    });

    it('includes monetary totals', () => {
        const xml = orderToXml(ORDER, ITEMS, BUYER, [SELLER]);
        expect(xml).toContain('<cac:AnticipatedMonetaryTotal>');
        expect(xml).toContain('19.98');
    });

    it('includes discount AllowanceTotalAmount when price was discounted', () => {
        const discountedOrder = { ...ORDER, total_price: 15.00 };
        const xml = orderToXml(discountedOrder, ITEMS, BUYER, [SELLER]);
        expect(xml).toContain('<cbc:AllowanceTotalAmount');
    });

    it('omits AllowanceTotalAmount when no discount was applied', () => {
        const xml = orderToXml(ORDER, ITEMS, BUYER, [SELLER]);
        expect(xml).not.toContain('<cbc:AllowanceTotalAmount');
    });

    it('handles empty sellers array', () => {
        const xml = orderToXml(ORDER, ITEMS, BUYER, []);
        expect(xml).not.toContain('<cac:SellerSupplierParty>');
    });

    it('handles buyer with no address fields', () => {
        const buyerNoAddr = { id: 1, name: 'NoAddr' };
        const xml = orderToXml(ORDER, ITEMS, buyerNoAddr, []);
        expect(xml).toContain('<cbc:Name>NoAddr</cbc:Name>');
        expect(xml).not.toContain('<cbc:StreetName>');
    });
});

describe('orderResponseToXml', () => {
    const RESPONSE = {
        id: 10,
        order_id: 1,
        seller_id: 5,
        response_code: 'AB',
        note: 'Accepted',
        created_at: new Date('2026-01-15T12:00:00.000Z'),
    };

    it('produces valid UBL 2.1 OrderResponse XML', () => {
        const xml = orderResponseToXml(RESPONSE, ORDER, ITEMS, BUYER, SELLER);
        expect(xml).toContain('xmlns="urn:oasis:names:specification:ubl:schema:xsd:OrderResponse-2"');
        expect(xml).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
    });

    it('includes response code', () => {
        const xml = orderResponseToXml(RESPONSE, ORDER, ITEMS, BUYER, SELLER);
        expect(xml).toContain('<cbc:OrderCommunicationTypeCode>AB</cbc:OrderCommunicationTypeCode>');
    });

    it('includes note when present', () => {
        const xml = orderResponseToXml(RESPONSE, ORDER, ITEMS, BUYER, SELLER);
        expect(xml).toContain('<cbc:Note>Accepted</cbc:Note>');
    });

    it('omits Note element when note is null', () => {
        const xml = orderResponseToXml({ ...RESPONSE, note: null }, ORDER, ITEMS, BUYER, SELLER);
        expect(xml).not.toContain('<cbc:Note>');
    });

    it('includes order reference', () => {
        const xml = orderResponseToXml(RESPONSE, ORDER, ITEMS, BUYER, SELLER);
        expect(xml).toContain('<cac:OrderReference>');
    });

    it('includes both seller and buyer parties', () => {
        const xml = orderResponseToXml(RESPONSE, ORDER, ITEMS, BUYER, SELLER);
        expect(xml).toContain('<cac:SellerSupplierParty>');
        expect(xml).toContain('<cac:BuyerCustomerParty>');
        expect(xml).toContain('<cbc:Name>BobShop</cbc:Name>');
        expect(xml).toContain('<cbc:Name>Alice</cbc:Name>');
    });

    it('includes order lines', () => {
        const xml = orderResponseToXml(RESPONSE, ORDER, ITEMS, BUYER, SELLER);
        expect(xml).toContain('<cac:OrderLine>');
        expect(xml).toContain('<cbc:Name>Widget</cbc:Name>');
    });
});

describe('orderCancellationToXml', () => {
    const CANCELLATION = {
        id: 20,
        order_id: 1,
        buyer_id: 1,
        reason: 'Changed mind',
        created_at: new Date('2026-01-15T14:00:00.000Z'),
    };

    it('produces valid UBL 2.1 OrderCancellation XML', () => {
        const xml = orderCancellationToXml(CANCELLATION, ORDER, BUYER, [SELLER]);
        expect(xml).toContain('xmlns="urn:oasis:names:specification:ubl:schema:xsd:OrderCancellation-2"');
        expect(xml).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
    });

    it('includes cancellation reason as Note', () => {
        const xml = orderCancellationToXml(CANCELLATION, ORDER, BUYER, [SELLER]);
        expect(xml).toContain('<cbc:Note>Changed mind</cbc:Note>');
    });

    it('omits Note when reason is null', () => {
        const xml = orderCancellationToXml({ ...CANCELLATION, reason: null }, ORDER, BUYER, [SELLER]);
        expect(xml).not.toContain('<cbc:Note>');
    });

    it('includes order reference', () => {
        const xml = orderCancellationToXml(CANCELLATION, ORDER, BUYER, [SELLER]);
        expect(xml).toContain('<cac:OrderReference>');
    });

    it('includes buyer party', () => {
        const xml = orderCancellationToXml(CANCELLATION, ORDER, BUYER, [SELLER]);
        expect(xml).toContain('<cac:BuyerCustomerParty>');
        expect(xml).toContain('<cbc:Name>Alice</cbc:Name>');
    });

    it('includes seller parties', () => {
        const xml = orderCancellationToXml(CANCELLATION, ORDER, BUYER, [SELLER]);
        expect(xml).toContain('<cac:SellerSupplierParty>');
        expect(xml).toContain('<cbc:Name>BobShop</cbc:Name>');
    });
});
