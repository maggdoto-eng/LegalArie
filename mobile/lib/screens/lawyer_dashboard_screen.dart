import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// Lawyer Dashboard Screen - Mobile App (Flutter)
/// Shows case management, tasks, and time tracking

class LawyerDashboardScreen extends StatefulWidget {
  @override
  _LawyerDashboardScreenState createState() => _LawyerDashboardScreenState();
}

class _LawyerDashboardScreenState extends State<LawyerDashboardScreen> {
  String selectedTab = 'overview'; // overview, tasks, timeLog

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: Colors.blue[600],
          title: Text('Lawyer Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
          elevation: 0,
          bottom: TabBar(
            labelColor: Colors.white,
            unselectedLabelColor: Colors.blue[200],
            indicatorColor: Colors.white,
            tabs: [
              Tab(text: 'Overview', icon: Icon(Icons.dashboard)),
              Tab(text: 'Tasks', icon: Icon(Icons.checklist)),
              Tab(text: 'Time Log', icon: Icon(Icons.timer)),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildOverviewTab(),
            _buildTasksTab(),
            _buildTimeLogTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      child: Column(
        children: [
          // KPI Cards
          Container(
            padding: EdgeInsets.all(12),
            child: Column(
              children: [
                KPICard(
                  title: 'Active Cases',
                  value: '12',
                  subtitle: '3 with pending tasks',
                  color: Colors.blue,
                  icon: Icons.folder_open,
                ),
                SizedBox(height: 12),
                KPICard(
                  title: 'Billable Hours This Month',
                  value: '156',
                  subtitle: 'Target: 160 hours',
                  color: Colors.green,
                  icon: Icons.timer,
                ),
                SizedBox(height: 12),
                KPICard(
                  title: 'Revenue Attribution',
                  value: '₨ 4.2L',
                  subtitle: 'This month so far',
                  color: Colors.purple,
                  icon: Icons.trending_up,
                ),
              ],
            ),
          ),

          // Recent Cases
          Padding(
            padding: EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Recent Cases',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 12),
                _buildRecentCaseItem('CV-2026-001', 'Smith vs Jones', 'Active', Colors.green),
                SizedBox(height: 8),
                _buildRecentCaseItem('CV-2026-002', 'Corporate Merger', 'Open', Colors.blue),
                SizedBox(height: 8),
                _buildRecentCaseItem('CV-2026-003', 'Employment Dispute', 'Hearing Scheduled', Colors.orange),
              ],
            ),
          ),

          // Upcoming Hearings
          Padding(
            padding: EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Upcoming Hearings',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 12),
                _buildHearingItem('CV-2026-001', 'Smith vs Jones', '15 Apr 2026, 2:00 PM', 'District Court'),
                SizedBox(height: 8),
                _buildHearingItem('CV-2026-003', 'Employment Case', '22 Apr 2026, 10:00 AM', 'High Court'),
              ],
            ),
          ),

          SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildTasksTab() {
    return ListView(
      padding: EdgeInsets.all(12),
      children: [
        // Filter
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildTaskFilter('All', true),
              SizedBox(width: 8),
              _buildTaskFilter('Pending', false),
              SizedBox(width: 8),
              _buildTaskFilter('Completed', false),
              SizedBox(width: 8),
              _buildTaskFilter('Overdue', false),
            ],
          ),
        ),
        SizedBox(height: 16),

        // Tasks
        _buildTaskItem(
          'Prepare witness statement',
          'CV-2026-001 - Smith vs Jones',
          'Due: 20 Apr 2026',
          'High',
          Colors.red,
          true,
        ),
        SizedBox(height: 12),
        _buildTaskItem(
          'Review contract terms',
          'CV-2026-002 - Corporate Merger',
          'Due: 18 Apr 2026',
          'Critical',
          Colors.red.shade900,
          false,
        ),
        SizedBox(height: 12),
        _buildTaskItem(
          'Respond to client inquiry',
          'CV-2026-003 - Employment Case',
          'Due: 19 Apr 2026',
          'Medium',
          Colors.orange,
          false,
        ),
        SizedBox(height: 12),
        _buildTaskItem(
          'File motion with court',
          'CV-2026-001 - Smith vs Jones',
          'Due: 25 Apr 2026',
          'Medium',
          Colors.orange,
          false,
        ),
      ],
    );
  }

  Widget _buildTimeLogTab() {
    return Column(
      children: [
        // Today's Hours
        Padding(
          padding: EdgeInsets.all(12),
          child: Container(
            padding: EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue[200]!),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Today's Hours",
                  style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                ),
                SizedBox(height: 8),
                Text(
                  '7.5 / 8 hours',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.blue[700]),
                ),
                SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: 7.5 / 8,
                    minHeight: 8,
                    backgroundColor: Colors.blue[200],
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.green),
                  ),
                ),
              ],
            ),
          ),
        ),

        // Log Time Button
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 12),
          child: ElevatedButton.icon(
            onPressed: () {
              _showTimeLogDialog(context);
            },
            icon: Icon(Icons.add),
            label: Text('Log Time Entry'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green[600],
              foregroundColor: Colors.white,
              padding: EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ),
        SizedBox(height: 16),

        // Time Entries
        Expanded(
          child: ListView(
            padding: EdgeInsets.symmetric(horizontal: 12),
            children: [
              _buildTimeEntry(
                'Smith vs Jones - Document review',
                '2.5 hours',
                '18 Apr 2026, 10:00 AM',
                '₨ 1,250',
                true,
              ),
              SizedBox(height: 8),
              _buildTimeEntry(
                'Corporate Merger - Due diligence',
                '3.0 hours',
                '18 Apr 2026, 1:30 PM',
                '₨ 1,500',
                true,
              ),
              SizedBox(height: 8),
              _buildTimeEntry(
                'Employment Case - Client call',
                '1.0 hour',
                '17 Apr 2026, 4:00 PM',
                '₨ 500',
                true,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRecentCaseItem(String caseNum, String title, String status, Color color) {
    return Container(
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey[300]!),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(caseNum, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blue[600])),
              SizedBox(height: 4),
              Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            ],
          ),
          Container(
            padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: color.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
            child: Text(status, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color)),
          ),
        ],
      ),
    );
  }

  Widget _buildHearingItem(String caseNum, String title, String dateTime, String court) {
    return Container(
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border(left: BorderSide(color: Colors.orange, width: 4)),
        borderRadius: BorderRadius.circular(8),
        color: Colors.orange[50],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          SizedBox(height: 4),
          Text(dateTime, style: TextStyle(fontSize: 12, color: Colors.orange[700], fontWeight: FontWeight.w500)),
          Text(court, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
        ],
      ),
    );
  }

  Widget _buildTaskFilter(String label, bool selected) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: selected ? Colors.blue[600] : Colors.grey[200],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: selected ? Colors.white : Colors.grey[700],
        ),
      ),
    );
  }

  Widget _buildTaskItem(String title, String caseInfo, String dueDate, String priority, Color priorityColor, bool completed) {
    return Container(
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: completed ? Colors.green[200]! : Colors.grey[300]!),
        borderRadius: BorderRadius.circular(8),
        color: completed ? Colors.green[50] : Colors.white,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Checkbox(
                value: completed,
                onChanged: (_) {},
                activeColor: Colors.green,
              ),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    decoration: completed ? TextDecoration.lineThrough : TextDecoration.none,
                  ),
                ),
              ),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: priorityColor.withOpacity(0.2), borderRadius: BorderRadius.circular(4)),
                child: Text(priority, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: priorityColor)),
              ),
            ],
          ),
          SizedBox(height: 8),
          Text(caseInfo, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
          Text(dueDate, style: TextStyle(fontSize: 11, color: Colors.grey[500])),
        ],
      ),
    );
  }

  Widget _buildTimeEntry(String description, String hours, String dateTime, String billable, bool billableHours) {
    return Container(
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey[300]!),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(child: Text(description, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
              Text(hours, style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.blue[600])),
            ],
          ),
          SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(dateTime, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
              if (billableHours)
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: Colors.green[100], borderRadius: BorderRadius.circular(4)),
                  child: Text(billable, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green[700])),
                ),
            ],
          ),
        ],
      ),
    );
  }

  void _showTimeLogDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (context) => Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Log Time Entry', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            SizedBox(height: 16),
            TextField(
              decoration: InputDecoration(
                labelText: 'Select Case',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            SizedBox(height: 12),
            TextField(
              decoration: InputDecoration(
                labelText: 'Description',
                hintText: 'What did you work on?',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            SizedBox(height: 12),
            TextField(
              decoration: InputDecoration(
                labelText: 'Hours',
                hintText: '2.5',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Log Time'),
              style: ElevatedButton.styleFrom(
                minimumSize: Size(double.infinity, 48),
                backgroundColor: Colors.blue[600],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// KPI Card Widget
class KPICard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final Color color;
  final IconData icon;

  const KPICard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        border: Border.all(color: color.withOpacity(0.3)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            padding: EdgeInsets.all(12),
            decoration: BoxDecoration(color: color.withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, color: color, size: 24),
          ),
          SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                SizedBox(height: 4),
                Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
                SizedBox(height: 4),
                Text(subtitle, style: TextStyle(fontSize: 11, color: Colors.grey[500])),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
