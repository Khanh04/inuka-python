"""
VNACCS XML Export using template-based approach.
This module generates VNACCS XML by using the sample file as a template
and replacing values with actual data where available.
"""
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

from lxml import etree


class VNACCSTemplateExporter:
    """VNACCS XML exporter using template-based approach."""

    def __init__(self, template_path: Optional[str] = None):
        """Initialize with path to sample VNACCS XML template."""
        if template_path is None:
            # Use the sample.xml as default template
            template_path = Path(__file__).parent.parent.parent / "sample.xml"

        self.template_path = template_path
        self._load_template()

    def _load_template(self):
        """Load and parse the XML template."""
        with open(self.template_path, "r", encoding="utf-8") as f:
            self.template_tree = etree.parse(f)
            self.template_root = self.template_tree.getroot()

    def generate_xml(self, params: Dict[str, str]) -> str:
        """
        Generate VNACCS XML by replacing template values with provided params.

        Args:
            params: Dictionary of field_name -> value mappings

        Returns:
            XML string with values replaced
        """
        # Create a copy of the template
        root = etree.fromstring(etree.tostring(self.template_root))

        # Update root-level fields
        date_elem = root.find("Date")
        if date_elem is not None:
            date_elem.text = datetime.now().strftime("%d/%m/%Y")

        # Find the DToKhaiMD/Data section
        data_elem = root.find("DToKhaiMDIDs/DToKhaiMD/Data")

        if data_elem is not None:
            # Replace values in the Data section with provided params
            for field_name, field_value in params.items():
                field_elem = data_elem.find(field_name)
                if field_elem is not None:
                    field_elem.text = str(field_value)

        return etree.tostring(
            root,
            pretty_print=True,
            xml_declaration=True,
            encoding="UTF-8",
        ).decode("utf-8")
