"""Vietnamese VNACCS customs export XML data structures."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class DToKhaiMDData(BaseModel):
    """Main customs declaration data (DToKhaiMD > Data)."""

    # Basic declaration info
    SOTK: Optional[str] = Field(default=None, description="Declaration number")
    MAHQ: Optional[str] = Field(default=None, description="Customs office code")
    MALH: Optional[str] = Field(default=None, description="Declaration type code")
    NAMDK: Optional[str] = Field(default=None, description="Declaration year")
    NGAYDK: Optional[str] = Field(default=None, description="Declaration date")

    # Declarant info
    MADV: Optional[str] = Field(default=None, description="Declarant code")
    DIACHIDV: Optional[str] = Field(default=None, description="Declarant address")
    SODTDV: Optional[str] = Field(default=None, description="Declarant phone")

    # Exporter/Importer info
    MADVUT: Optional[str] = Field(default=None, description="Exporter code")
    DVDT: Optional[str] = Field(default=None, description="Importer name")

    # Transport info
    MAPTVT: Optional[str] = Field(default=None, description="Transport mode code")
    TENPTVT: Optional[str] = Field(default=None, description="Vessel name")
    VANDON: Optional[str] = Field(default=None, description="Bill of lading number")
    NGAYVANDON: Optional[str] = Field(default=None, description="Bill of lading date")

    # Port info
    MACANGNN: Optional[str] = Field(default=None, description="Port code")
    CANGNN: Optional[str] = Field(default=None, description="Port name")

    # Country info
    NUOCXK: Optional[str] = Field(default=None, description="Export country code")
    NUOCNK: Optional[str] = Field(default=None, description="Import country code")

    # Financial info
    MANT: Optional[str] = Field(default=None, description="Currency code")
    TYGIAUSD: Optional[str] = Field(default=None, description="Exchange rate USD")
    TYGIAVND: Optional[str] = Field(default=None, description="Exchange rate VND")
    TONGTGKB: Optional[str] = Field(default=None, description="Total FOB value")
    TONGTGTT: Optional[str] = Field(default=None, description="Total CIF value")

    # Insurance and freight
    PHIBH: Optional[str] = Field(default=None, description="Insurance fee")
    PHIVC: Optional[str] = Field(default=None, description="Freight fee")

    # Weight and quantity
    TRLUONG: Optional[str] = Field(default=None, description="Gross weight")
    SOKIEN: Optional[str] = Field(default=None, description="Number of packages")

    # Container info
    SOCONTAINER: Optional[str] = Field(default=None, description="Number of 20ft containers")
    SOCONTAINER40: Optional[str] = Field(default=None, description="Number of 40ft containers")

    # User info
    USERDK: Optional[str] = Field(default=None, description="User declared")
    NGUOINHAP: Optional[str] = Field(default=None, description="Data entry user")
    NGAYNHAP: Optional[str] = Field(default=None, description="Data entry date")

    class Config:
        populate_by_name = True


class DHangMDDKData(BaseModel):
    """Goods item data (DHangMDDK > Data)."""

    STTHANG: Optional[str] = Field(default=None, description="Item number")
    MAHANG: Optional[str] = Field(default=None, description="HS Code")
    TENHANG: Optional[str] = Field(default=None, description="Description")
    TENHANGE: Optional[str] = Field(default=None, description="Description (English)")

    # Origin
    NUOCXX: Optional[str] = Field(default=None, description="Country of origin code")
    TENNUOCXX: Optional[str] = Field(default=None, description="Country of origin name")

    # Quantity and weight
    MADVT: Optional[str] = Field(default=None, description="Unit code")
    LUONG: Optional[str] = Field(default=None, description="Quantity")

    # Values
    DGIAKB: Optional[str] = Field(default=None, description="Unit price FOB")
    DGIATT: Optional[str] = Field(default=None, description="Unit price CIF")
    TRIGIAKB: Optional[str] = Field(default=None, description="Total FOB value")
    TRIGIATT: Optional[str] = Field(default=None, description="Total CIF value")

    # Tax rates and amounts
    TSXNK: Optional[str] = Field(default=None, description="Import/Export tax rate")
    THUEXNK: Optional[str] = Field(default=None, description="Import/Export tax amount")
    TSVAT: Optional[str] = Field(default=None, description="VAT rate")
    THUEVAT: Optional[str] = Field(default=None, description="VAT amount")

    class Config:
        populate_by_name = True


class VNACCSContainerData(BaseModel):
    """Container data for VNACCS."""

    CONTAINERNO: Optional[str] = Field(default=None, description="Container number 1")
    CONTAINERNO2: Optional[str] = Field(default=None, description="Container number 2")
    CONTAINERNO3: Optional[str] = Field(default=None, description="Container number 3")

    class Config:
        populate_by_name = True


class VNACCSRoot(BaseModel):
    """Root structure for Vietnamese VNACCS XML export."""

    # Root-level header fields
    App: str = Field(default="ECUS5VNACCS2018")
    DBVersion: str = Field(default="300")
    LastUpdate: str = Field(default="")
    VersionMessage: str = Field(default="")
    Date: str = Field(default="")

    # Main declaration data
    declaration_data: Optional[DToKhaiMDData] = Field(default=None)

    # Goods items
    goods_items: List[DHangMDDKData] = Field(default_factory=list)

    # Container data
    container_data: Optional[VNACCSContainerData] = Field(default=None)

    class Config:
        populate_by_name = True

    def to_xml(self) -> str:
        """Convert to VNACCS XML string matching sample format."""
        from lxml import etree

        root = etree.Element("Root")

        # Root-level header fields (matching sample XML)
        etree.SubElement(root, "App").text = self.App
        etree.SubElement(root, "DBVersion").text = self.DBVersion
        etree.SubElement(root, "LastUpdate").text = self.LastUpdate or ""
        etree.SubElement(root, "VersionMessage").text = self.VersionMessage or ""
        etree.SubElement(root, "Date").text = self.Date or datetime.now().strftime("%d/%m/%Y")

        # DToKhaiMDIDs section - main declaration
        dtokhaimdids_elem = etree.SubElement(root, "DToKhaiMDIDs")
        dtokhaimd_elem = etree.SubElement(dtokhaimdids_elem, "DToKhaiMD")
        data_elem = etree.SubElement(dtokhaimd_elem, "Data")

        # Add declaration fields with "NULL" as default for empty values (matching VNACCS sample)
        if self.declaration_data:
            decl = self.declaration_data
            for field_name in DToKhaiMDData.model_fields.keys():
                field_value = getattr(decl, field_name, None)
                # Use "NULL" as default for empty fields to match VNACCS format
                etree.SubElement(data_elem, field_name).text = str(field_value) if field_value else "NULL"

        # DHangMDDKs section (goods items)
        dhangs_elem = etree.SubElement(root, "DHangMDDKs")
        if self.goods_items:
            for item in self.goods_items:
                dhang_elem = etree.SubElement(dhangs_elem, "DHangMDDK")
                item_data_elem = etree.SubElement(dhang_elem, "Data")

                for field_name in DHangMDDKData.model_fields.keys():
                    field_value = getattr(item, field_name, None)
                    etree.SubElement(item_data_elem, field_name).text = str(field_value) if field_value else "NULL"

                # Add empty placeholder sections for goods items (matching sample)
                etree.SubElement(dhang_elem, "TTKTG_PP2s")
                etree.SubElement(dhang_elem, "TTKTG_PP3s")
                etree.SubElement(dhang_elem, "TTKTG_PP4s")

        # Empty placeholder sections as per sample XML
        etree.SubElement(root, "DHangMDKHs")
        etree.SubElement(root, "DHangMDTHs")
        etree.SubElement(root, "DDieuChinhs")
        etree.SubElement(root, "DHangMDDCs")
        etree.SubElement(root, "DHangMDDC_CTs")
        etree.SubElement(root, "DVan_Dons")
        etree.SubElement(root, "TTKTG_PP1s")
        etree.SubElement(root, "DTBTs")
        etree.SubElement(root, "DTOKHAIMD_GPs")
        etree.SubElement(root, "DTOKHAIMD_COs")
        etree.SubElement(root, "DTOKHAIMD_DeNghiChuyenCKs")
        etree.SubElement(root, "DLogInfos")
        etree.SubElement(root, "DToKhaiMD_HoaDonTMs")
        etree.SubElement(root, "DToKhaiMD_HopDongTMs")
        etree.SubElement(root, "DChungTuBS_AMAs")
        etree.SubElement(root, "DCHUNGTU_BSs")
        etree.SubElement(root, "DDS_CONT_TKs")

        return etree.tostring(
            root,
            pretty_print=True,
            xml_declaration=True,
            encoding="UTF-8",
        ).decode("utf-8")
