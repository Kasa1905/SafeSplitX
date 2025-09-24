#!/usr/bin/env python3
"""
SafeSplitX Fraud Detection - Streamlit Demo Interface
A simple web interface for testing the fraud detection API
"""

import streamlit as st
import requests
import json
import pandas as pd
from datetime import datetime, time
import plotly.express as px
import plotly.graph_objects as go
from typing import Dict, Any, List

# Configuration
API_BASE_URL = "http://localhost:8000"

# Page Configuration
st.set_page_config(
    page_title="SafeSplitX Fraud Detection Demo",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

def check_api_health() -> bool:
    """Check if the fraud detection API is running"""
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def predict_fraud(expense_data: Dict[str, Any]) -> Dict[str, Any]:
    """Send expense data to fraud detection API"""
    try:
        response = requests.post(
            f"{API_BASE_URL}/predict",
            json=expense_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"API Error: {response.status_code} - {response.text}"}
    except requests.exceptions.RequestException as e:
        return {"error": f"Connection Error: {str(e)}"}

def predict_batch(expenses: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Send batch of expenses to fraud detection API"""
    try:
        response = requests.post(
            f"{API_BASE_URL}/predict-batch",
            json={"expenses": expenses},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"API Error: {response.status_code} - {response.text}"}
    except requests.exceptions.RequestException as e:
        return {"error": f"Connection Error: {str(e)}"}

def main():
    # Header
    st.title("🛡️ SafeSplitX Fraud Detection Demo")
    st.markdown("### Test your AI-powered fraud detection system")
    
    # API Status Check
    col1, col2 = st.columns([3, 1])
    with col1:
        st.markdown("**API Status:**")
    with col2:
        if check_api_health():
            st.success("🟢 Online")
        else:
            st.error("🔴 Offline")
            st.warning("⚠️ Make sure the fraud detection service is running: `cd fraud-detection-service && docker-compose up`")
            st.stop()
    
    # Sidebar Configuration
    st.sidebar.title("🔧 Test Configuration")
    test_mode = st.sidebar.selectbox(
        "Test Mode",
        ["Single Expense", "Batch Testing", "Sample Scenarios"]
    )
    
    if test_mode == "Single Expense":
        single_expense_interface()
    elif test_mode == "Batch Testing":
        batch_testing_interface()
    else:
        sample_scenarios_interface()

def single_expense_interface():
    """Interface for testing single expense"""
    st.header("💰 Single Expense Testing")
    
    # Input Form
    with st.form("expense_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("💳 Basic Information")
            amount = st.number_input("Amount ($)", min_value=0.01, value=50.0, step=0.01)
            category = st.selectbox(
                "Category",
                ["food", "restaurant", "entertainment", "transportation", "shopping", 
                 "utilities", "groceries", "healthcare", "education", "travel", "other"]
            )
            location = st.text_input("Location", value="New York")
            
            # Date and Time
            expense_date = st.date_input("Date", datetime.now().date())
            expense_time = st.time_input("Time", datetime.now().time())
            
        with col2:
            st.subheader("👥 Group & Payment")
            participants = st.text_area(
                "Participants (one per line)",
                value="user1\nuser2\nuser3",
                height=100
            )
            payment_method = st.selectbox(
                "Payment Method",
                ["credit_card", "debit_card", "cash", "digital_wallet", "bank_transfer"]
            )
            merchant_name = st.text_input("Merchant Name", value="Restaurant ABC")
            
        # Advanced Options
        with st.expander("🔧 Advanced Options"):
            user_id = st.text_input("User ID", value="user123")
            group_id = st.text_input("Group ID", value="group456")
            split_method = st.selectbox("Split Method", ["equal", "custom", "percentage"])
            
        submitted = st.form_submit_button("🔍 Analyze Expense")
        
        if submitted:
            # Prepare data
            participants_list = [p.strip() for p in participants.split('\n') if p.strip()]
            
            expense_data = {
                "amount": amount,
                "category": category,
                "location": location,
                "timestamp": f"{expense_date}T{expense_time}",
                "participants": participants_list,
                "payment_method": payment_method,
                "merchant_name": merchant_name,
                "user_id": user_id,
                "group_id": group_id,
                "split_method": split_method
            }
            
            # Make Prediction
            with st.spinner("🤖 Analyzing expense for fraud..."):
                result = predict_fraud(expense_data)
            
            # Display Results
            display_single_result(result, expense_data)

def display_single_result(result: Dict[str, Any], expense_data: Dict[str, Any]):
    """Display results for single expense analysis"""
    if "error" in result:
        st.error(f"❌ {result['error']}")
        return
    
    # Main Results
    col1, col2, col3 = st.columns(3)
    
    with col1:
        is_fraud = result.get('is_fraud', False)
        if is_fraud:
            st.error("🚨 FRAUD DETECTED")
        else:
            st.success("✅ LEGITIMATE")
    
    with col2:
        fraud_prob = result.get('fraud_probability', 0)
        st.metric("Fraud Probability", f"{fraud_prob:.2%}")
    
    with col3:
        risk_score = result.get('risk_score', 0)
        risk_level = result.get('risk_level', 'unknown')
        st.metric("Risk Score", f"{risk_score:.1f}")
    
    # Risk Level Visualization
    fig = go.Figure(go.Indicator(
        mode = "gauge+number",
        value = fraud_prob * 100,
        title = {'text': "Fraud Risk Level"},
        domain = {'x': [0, 1], 'y': [0, 1]},
        gauge = {
            'axis': {'range': [None, 100]},
            'bar': {'color': "red" if is_fraud else "green"},
            'steps': [
                {'range': [0, 30], 'color': "lightgreen"},
                {'range': [30, 70], 'color': "yellow"},
                {'range': [70, 100], 'color': "lightcoral"}
            ],
            'threshold': {
                'line': {'color': "red", 'width': 4},
                'thickness': 0.75,
                'value': 50
            }
        }
    ))
    fig.update_layout(height=300)
    st.plotly_chart(fig, use_container_width=True)
    
    # Explanation
    if 'explanation' in result:
        st.subheader("🧠 AI Explanation")
        explanation = result['explanation']
        
        # Primary Factors
        if 'primary_factors' in explanation:
            st.write("**Key Factors:**")
            for factor in explanation['primary_factors']:
                st.write(f"• {factor}")
        
        # Feature Importance
        if 'feature_importance' in explanation:
            st.write("**Feature Importance:**")
            importance_data = explanation['feature_importance']
            
            # Create bar chart
            features = list(importance_data.keys())
            importance = list(importance_data.values())
            
            fig = px.bar(
                x=importance, 
                y=features, 
                orientation='h',
                title="Feature Importance in Decision",
                labels={'x': 'Importance Score', 'y': 'Features'}
            )
            fig.update_layout(height=300)
            st.plotly_chart(fig, use_container_width=True)
    
    # Raw Data
    with st.expander("📊 Raw Response Data"):
        st.json(result)
    
    with st.expander("📝 Input Data"):
        st.json(expense_data)

def batch_testing_interface():
    """Interface for batch testing multiple expenses"""
    st.header("📊 Batch Testing")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("Upload Test Data")
        
        # Sample data generator
        if st.button("🎲 Generate Sample Data"):
            sample_data = generate_sample_expenses()
            st.session_state.batch_data = sample_data
        
        # Manual input
        st.subheader("Manual Input (JSON Format)")
        default_batch = [
            {
                "amount": 25.50,
                "category": "food",
                "location": "NYC",
                "participants": ["user1", "user2"],
                "payment_method": "credit_card"
            },
            {
                "amount": 500.00,
                "category": "entertainment",
                "location": "Unknown",
                "participants": ["user1"],
                "payment_method": "cash"
            }
        ]
        
        batch_input = st.text_area(
            "Expense Data (JSON Array)",
            value=json.dumps(default_batch, indent=2),
            height=300
        )
    
    with col2:
        st.subheader("⚙️ Batch Options")
        show_details = st.checkbox("Show detailed results", True)
        export_results = st.checkbox("Enable export", False)
    
    if st.button("🔍 Analyze Batch"):
        try:
            expenses = json.loads(batch_input)
            
            with st.spinner(f"🤖 Analyzing {len(expenses)} expenses..."):
                result = predict_batch(expenses)
            
            display_batch_results(result, expenses, show_details, export_results)
            
        except json.JSONDecodeError:
            st.error("❌ Invalid JSON format. Please check your input.")

def display_batch_results(result: Dict[str, Any], expenses: List[Dict], show_details: bool, export_results: bool):
    """Display batch analysis results"""
    if "error" in result:
        st.error(f"❌ {result['error']}")
        return
    
    results = result.get('results', [])
    
    # Summary Statistics
    st.subheader("📈 Batch Analysis Summary")
    
    col1, col2, col3, col4 = st.columns(4)
    
    fraud_count = sum(1 for r in results if r.get('is_fraud', False))
    total_count = len(results)
    avg_risk = sum(r.get('risk_score', 0) for r in results) / max(total_count, 1)
    avg_fraud_prob = sum(r.get('fraud_probability', 0) for r in results) / max(total_count, 1)
    
    with col1:
        st.metric("Total Expenses", total_count)
    
    with col2:
        st.metric("Fraud Detected", fraud_count)
    
    with col3:
        st.metric("Average Risk Score", f"{avg_risk:.1f}")
    
    with col4:
        st.metric("Average Fraud Probability", f"{avg_fraud_prob:.2%}")
    
    # Results Table
    st.subheader("📋 Detailed Results")
    
    # Prepare data for table
    table_data = []
    for i, (expense, result_item) in enumerate(zip(expenses, results)):
        table_data.append({
            "ID": i + 1,
            "Amount": f"${expense.get('amount', 0):.2f}",
            "Category": expense.get('category', 'N/A'),
            "Location": expense.get('location', 'N/A'),
            "Fraud": "🚨 YES" if result_item.get('is_fraud', False) else "✅ NO",
            "Risk Score": f"{result_item.get('risk_score', 0):.1f}",
            "Fraud Prob": f"{result_item.get('fraud_probability', 0):.2%}",
            "Risk Level": result_item.get('risk_level', 'unknown').upper()
        })
    
    df = pd.DataFrame(table_data)
    st.dataframe(df, use_container_width=True)
    
    # Visualization
    col1, col2 = st.columns(2)
    
    with col1:
        # Fraud Distribution
        fraud_dist = df['Fraud'].value_counts()
        fig = px.pie(
            values=fraud_dist.values,
            names=fraud_dist.index,
            title="Fraud Detection Distribution"
        )
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        # Risk Score Distribution
        fig = px.histogram(
            df,
            x='Risk Score',
            title="Risk Score Distribution",
            nbins=10
        )
        st.plotly_chart(fig, use_container_width=True)
    
    # Export Results
    if export_results:
        st.subheader("💾 Export Results")
        
        col1, col2 = st.columns(2)
        with col1:
            csv_data = df.to_csv(index=False)
            st.download_button(
                label="📄 Download CSV",
                data=csv_data,
                file_name=f"fraud_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv"
            )
        
        with col2:
            json_data = json.dumps(result, indent=2)
            st.download_button(
                label="📋 Download JSON",
                data=json_data,
                file_name=f"fraud_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                mime="application/json"
            )

def sample_scenarios_interface():
    """Interface for testing predefined scenarios"""
    st.header("🎭 Sample Scenarios")
    
    scenarios = {
        "Normal Restaurant Bill": {
            "amount": 45.50,
            "category": "restaurant",
            "location": "New York",
            "participants": ["alice", "bob", "charlie"],
            "payment_method": "credit_card",
            "merchant_name": "Pizza Palace"
        },
        "Suspicious High Amount": {
            "amount": 2500.00,
            "category": "entertainment",
            "location": "Unknown Location",
            "participants": ["user1"],
            "payment_method": "cash",
            "merchant_name": "Cash Only Store"
        },
        "Late Night Expense": {
            "amount": 150.00,
            "category": "food",
            "location": "Downtown",
            "timestamp": "2024-01-01T02:30:00",
            "participants": ["night_user"],
            "payment_method": "credit_card",
            "merchant_name": "24H Diner"
        },
        "Round Number Amount": {
            "amount": 100.00,
            "category": "shopping",
            "location": "Mall",
            "participants": ["shopper1", "shopper2"],
            "payment_method": "debit_card",
            "merchant_name": "Department Store"
        },
        "International Transaction": {
            "amount": 75.50,
            "category": "travel",
            "location": "Tokyo, Japan",
            "participants": ["traveler"],
            "payment_method": "credit_card",
            "merchant_name": "Tokyo Restaurant"
        }
    }
    
    col1, col2 = st.columns([1, 2])
    
    with col1:
        st.subheader("📝 Available Scenarios")
        selected_scenario = st.selectbox("Choose a scenario:", list(scenarios.keys()))
        
        if st.button("🔍 Test Scenario"):
            scenario_data = scenarios[selected_scenario]
            
            with st.spinner(f"🤖 Testing '{selected_scenario}'..."):
                result = predict_fraud(scenario_data)
            
            st.session_state.scenario_result = result
            st.session_state.scenario_data = scenario_data
            st.session_state.scenario_name = selected_scenario
    
    with col2:
        st.subheader("📊 Scenario Details")
        scenario_data = scenarios[selected_scenario]
        st.json(scenario_data)
    
    # Display Results
    if hasattr(st.session_state, 'scenario_result'):
        st.header(f"🎯 Results for '{st.session_state.scenario_name}'")
        display_single_result(
            st.session_state.scenario_result, 
            st.session_state.scenario_data
        )

def generate_sample_expenses():
    """Generate sample expense data for testing"""
    import random
    
    categories = ["food", "restaurant", "entertainment", "transportation", "shopping"]
    locations = ["New York", "Los Angeles", "Chicago", "Unknown", "Mall", "Airport"]
    payment_methods = ["credit_card", "debit_card", "cash", "digital_wallet"]
    
    expenses = []
    for i in range(10):
        expense = {
            "amount": round(random.uniform(10, 500), 2),
            "category": random.choice(categories),
            "location": random.choice(locations),
            "participants": [f"user{j}" for j in range(1, random.randint(2, 5))],
            "payment_method": random.choice(payment_methods),
            "merchant_name": f"Merchant_{i+1}",
            "timestamp": f"2024-01-{random.randint(1,28):02d}T{random.randint(0,23):02d}:{random.randint(0,59):02d}:00"
        }
        expenses.append(expense)
    
    return expenses

if __name__ == "__main__":
    main()
