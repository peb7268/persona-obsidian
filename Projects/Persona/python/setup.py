"""Setup configuration for Persona job queue system."""

from setuptools import setup, find_packages

setup(
    name="persona-queue",
    version="0.1.0",
    description="Supabase-based job queue system for Persona AI agents",
    author="Persona",
    packages=find_packages(),
    install_requires=[
        "supabase>=2.0.0",
        "psutil>=5.9.0",
        "click>=8.1.0",
        "tabulate>=0.9.0",
        "python-dotenv>=1.0.0",
        "pydantic>=2.0.0",
    ],
    entry_points={
        "console_scripts": [
            "persona=persona.cli:cli",
            "persona-worker=persona.worker:main",
            "persona-monitor=persona.monitor:main",
        ],
    },
    python_requires=">=3.10",
)
