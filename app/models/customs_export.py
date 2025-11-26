"""Customs export XML data structures."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class Header(BaseModel):
    """XML Header section."""

    app: str = Field(default="ECUS5VNACCS2018", alias="App")
    db_version: str = Field(default="300", alias="DBVersion")
    last_update: str = Field(default="", alias="LastUpdate")
    version_message: str = Field(default="", alias="VersionMessage")
    date: str = Field(default="", alias="Date")

    class Config:
        populate_by_name = True


class Declarant(BaseModel):
    """Declarant information."""

    code: Optional[str] = Field(default=None, alias="Code")
    name: Optional[str] = Field(default=None, alias="Name")

    class Config:
        populate_by_name = True


class Exporter(BaseModel):
    """Exporter information."""

    code: Optional[str] = Field(default=None, alias="Code")
    name: Optional[str] = Field(default=None, alias="Name")

    class Config:
        populate_by_name = True


class Importer(BaseModel):
    """Importer information."""

    code: Optional[str] = Field(default=None, alias="Code")
    name: Optional[str] = Field(default=None, alias="Name")

    class Config:
        populate_by_name = True


class Container(BaseModel):
    """Container information."""

    no: Optional[str] = Field(default=None, alias="No")
    first_seal_no: Optional[str] = Field(default=None, alias="FirstSealNo")
    second_seal_no: Optional[str] = Field(default=None, alias="SecondSealNo")

    class Config:
        populate_by_name = True


class GoodsItemQuantity(BaseModel):
    """Goods item quantity."""

    quantity: Optional[str] = Field(default=None, alias="Quantity")
    unit_code: Optional[str] = Field(default=None, alias="UnitCode")

    class Config:
        populate_by_name = True


class GoodsItem(BaseModel):
    """Goods item in declaration."""

    item_no: Optional[str] = Field(default=None, alias="ItemNo")
    hs_code: Optional[str] = Field(default=None, alias="HSCode")
    description: Optional[str] = Field(default=None, alias="Description")
    origin_country_code: Optional[str] = Field(default=None, alias="OriginCountryCode")
    gross_weight: Optional[str] = Field(default=None, alias="GrossWeight")
    net_weight: Optional[str] = Field(default=None, alias="NetWeight")
    fob_value: Optional[str] = Field(default=None, alias="FOBValue")
    cif_value: Optional[str] = Field(default=None, alias="CIFValue")
    freight: Optional[str] = Field(default=None, alias="Freight")
    insurance: Optional[str] = Field(default=None, alias="Insurance")
    quantity: Optional[GoodsItemQuantity] = Field(default=None, alias="Quantity")

    class Config:
        populate_by_name = True


class Declaration(BaseModel):
    """Main customs declaration."""

    # Header information
    app_name: Optional[str] = Field(default=None, alias="AppName")
    declaration_kind_code: Optional[str] = Field(default=None, alias="DeclarationKindCode")
    customs_office_code: Optional[str] = Field(default=None, alias="CustomsOfficeCode")

    # Declaration details
    declaration_no: Optional[str] = Field(default=None, alias="DeclarationNo")
    declaration_date: Optional[str] = Field(default=None, alias="DeclarationDate")

    # Transport information
    transport_mode_code: Optional[str] = Field(default=None, alias="TransportModeCode")
    voyage_no: Optional[str] = Field(default=None, alias="VoyageNo")
    vessel_name: Optional[str] = Field(default=None, alias="VesselName")
    bill_of_lading_no: Optional[str] = Field(default=None, alias="BillOfLadingNo")

    # Parties
    declarant: Optional[Declarant] = Field(default_factory=Declarant, alias="Declarant")
    exporter: Optional[Exporter] = Field(default_factory=Exporter, alias="Exporter")
    importer: Optional[Importer] = Field(default_factory=Importer, alias="Importer")

    # Financial
    total_fob_value: Optional[str] = Field(default=None, alias="TotalFOBValue")
    total_cif_value: Optional[str] = Field(default=None, alias="TotalCIFValue")
    total_freight: Optional[str] = Field(default=None, alias="TotalFreight")
    total_insurance: Optional[str] = Field(default=None, alias="TotalInsurance")
    currency_code: Optional[str] = Field(default=None, alias="CurrencyCode")
    exchange_rate: Optional[str] = Field(default=None, alias="ExchangeRate")

    # Containers and goods
    containers: List[Container] = Field(default_factory=list, alias="Containers")
    goods_items: List[GoodsItem] = Field(default_factory=list, alias="GoodsItems")

    class Config:
        populate_by_name = True


class Body(BaseModel):
    """XML Body section containing declaration."""

    declaration: Declaration = Field(default_factory=Declaration, alias="Declaration")

    class Config:
        populate_by_name = True


class CustomsExportRoot(BaseModel):
    """Root XML structure for customs export."""

    header: Header = Field(default_factory=Header, alias="Header")
    body: Body = Field(default_factory=Body, alias="Body")

    class Config:
        populate_by_name = True

    def to_xml(self) -> str:
        """Convert to XML string."""
        from lxml import etree

        root = etree.Element("Root")

        # Header
        header_elem = etree.SubElement(root, "Header")
        etree.SubElement(header_elem, "App").text = self.header.app
        etree.SubElement(header_elem, "DBVersion").text = self.header.db_version
        etree.SubElement(header_elem, "LastUpdate").text = self.header.last_update
        etree.SubElement(header_elem, "VersionMessage").text = self.header.version_message
        etree.SubElement(header_elem, "Date").text = self.header.date or datetime.now().strftime("%Y-%m-%d")

        # Body
        body_elem = etree.SubElement(root, "Body")
        decl_elem = etree.SubElement(body_elem, "Declaration")

        # Declaration fields
        decl = self.body.declaration
        if decl.app_name:
            etree.SubElement(decl_elem, "AppName").text = decl.app_name
        if decl.declaration_kind_code:
            etree.SubElement(decl_elem, "DeclarationKindCode").text = decl.declaration_kind_code
        if decl.customs_office_code:
            etree.SubElement(decl_elem, "CustomsOfficeCode").text = decl.customs_office_code
        if decl.declaration_no:
            etree.SubElement(decl_elem, "DeclarationNo").text = decl.declaration_no
        if decl.declaration_date:
            etree.SubElement(decl_elem, "DeclarationDate").text = decl.declaration_date
        if decl.transport_mode_code:
            etree.SubElement(decl_elem, "TransportModeCode").text = decl.transport_mode_code
        if decl.voyage_no:
            etree.SubElement(decl_elem, "VoyageNo").text = decl.voyage_no
        if decl.vessel_name:
            etree.SubElement(decl_elem, "VesselName").text = decl.vessel_name
        if decl.bill_of_lading_no:
            etree.SubElement(decl_elem, "BillOfLadingNo").text = decl.bill_of_lading_no

        # Declarant
        if decl.declarant:
            declarant_elem = etree.SubElement(decl_elem, "Declarant")
            if decl.declarant.code:
                etree.SubElement(declarant_elem, "Code").text = decl.declarant.code
            if decl.declarant.name:
                etree.SubElement(declarant_elem, "Name").text = decl.declarant.name

        # Exporter
        if decl.exporter:
            exporter_elem = etree.SubElement(decl_elem, "Exporter")
            if decl.exporter.code:
                etree.SubElement(exporter_elem, "Code").text = decl.exporter.code
            if decl.exporter.name:
                etree.SubElement(exporter_elem, "Name").text = decl.exporter.name

        # Importer
        if decl.importer:
            importer_elem = etree.SubElement(decl_elem, "Importer")
            if decl.importer.code:
                etree.SubElement(importer_elem, "Code").text = decl.importer.code
            if decl.importer.name:
                etree.SubElement(importer_elem, "Name").text = decl.importer.name

        # Financial info
        if decl.total_fob_value:
            etree.SubElement(decl_elem, "TotalFOBValue").text = decl.total_fob_value
        if decl.total_cif_value:
            etree.SubElement(decl_elem, "TotalCIFValue").text = decl.total_cif_value
        if decl.total_freight:
            etree.SubElement(decl_elem, "TotalFreight").text = decl.total_freight
        if decl.total_insurance:
            etree.SubElement(decl_elem, "TotalInsurance").text = decl.total_insurance
        if decl.currency_code:
            etree.SubElement(decl_elem, "CurrencyCode").text = decl.currency_code
        if decl.exchange_rate:
            etree.SubElement(decl_elem, "ExchangeRate").text = decl.exchange_rate

        # Containers
        if decl.containers:
            containers_elem = etree.SubElement(decl_elem, "Containers")
            for container in decl.containers:
                cont_elem = etree.SubElement(containers_elem, "Container")
                if container.no:
                    etree.SubElement(cont_elem, "No").text = container.no
                if container.first_seal_no:
                    etree.SubElement(cont_elem, "FirstSealNo").text = container.first_seal_no
                if container.second_seal_no:
                    etree.SubElement(cont_elem, "SecondSealNo").text = container.second_seal_no

        # Goods Items
        if decl.goods_items:
            goods_elem = etree.SubElement(decl_elem, "GoodsItems")
            for item in decl.goods_items:
                item_elem = etree.SubElement(goods_elem, "GoodsItem")
                if item.item_no:
                    etree.SubElement(item_elem, "ItemNo").text = item.item_no
                if item.hs_code:
                    etree.SubElement(item_elem, "HSCode").text = item.hs_code
                if item.description:
                    etree.SubElement(item_elem, "Description").text = item.description
                if item.origin_country_code:
                    etree.SubElement(item_elem, "OriginCountryCode").text = item.origin_country_code
                if item.gross_weight:
                    etree.SubElement(item_elem, "GrossWeight").text = item.gross_weight
                if item.net_weight:
                    etree.SubElement(item_elem, "NetWeight").text = item.net_weight
                if item.fob_value:
                    etree.SubElement(item_elem, "FOBValue").text = item.fob_value
                if item.cif_value:
                    etree.SubElement(item_elem, "CIFValue").text = item.cif_value
                if item.freight:
                    etree.SubElement(item_elem, "Freight").text = item.freight
                if item.insurance:
                    etree.SubElement(item_elem, "Insurance").text = item.insurance
                if item.quantity:
                    qty_elem = etree.SubElement(item_elem, "Quantity")
                    if item.quantity.quantity:
                        etree.SubElement(qty_elem, "Quantity").text = item.quantity.quantity
                    if item.quantity.unit_code:
                        etree.SubElement(qty_elem, "UnitCode").text = item.quantity.unit_code

        return etree.tostring(
            root,
            pretty_print=True,
            xml_declaration=True,
            encoding="UTF-8",
        ).decode("utf-8")
