import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// Client Case List Screen - Mobile App (Flutter)
/// Shows all cases assigned to client with real-time status updates

class ClientCaseListScreen extends StatefulWidget {
  @override
  _ClientCaseListScreenState createState() => _ClientCaseListScreenState();
}

class _ClientCaseListScreenState extends State<ClientCaseListScreen> {
  String selectedFilter = 'all'; // all, open, active, closed

  final List<CaseModel> mockCases = [
    CaseModel(
      id: '1',
      caseNumber: 'CV-2026-001',
      title: 'Smith vs Jones - Contract Dispute',
      status: 'active',
      priority: 'high',
      lawyerName: 'Ahmed Hassan',
      nextHearing: DateTime.now().add(Duration(days: 15)),
      description: 'Ongoing commercial contract dispute resolution',
      messages: 23,
      documents: 12,
      value: 150000,
    ),
    CaseModel(
      id: '2',
      caseNumber: 'CV-2026-002',
      title: 'Corporate Merger Review',
      status: 'open',
      priority: 'critical',
      lawyerName: 'Sarah Khan',
      nextHearing: DateTime.now().add(Duration(days: 5)),
      description: 'Due diligence for tech startup acquisition',
      messages: 15,
      documents: 28,
      value: 280000,
    ),
    CaseModel(
      id: '3',
      caseNumber: 'CV-2026-003',
      title: 'Employment Law - Wrongful Termination',
      status: 'hearing_scheduled',
      priority: 'medium',
      lawyerName: 'Ali Malik',
      nextHearing: DateTime.now().add(Duration(days: 22)),
      description: 'Employee dispute hearing scheduled for next month',
      messages: 8,
      documents: 5,
      value: 95000,
    ),
    CaseModel(
      id: '4',
      caseNumber: 'CV-2025-045',
      title: 'Property Dispute - Resolved',
      status: 'closed',
      priority: 'low',
      lawyerName: 'Fatima Siddiqui',
      nextHearing: null,
      description: 'Successfully resolved through mediation',
      messages: 4,
      documents: 3,
      value: 45000,
    ),
  ];

  List<CaseModel> get filteredCases {
    if (selectedFilter == 'all') return mockCases;
    return mockCases.where((c) => c.status == selectedFilter).toList();
  }

  Color getStatusColor(String status) {
    switch (status) {
      case 'open':
        return Colors.grey;
      case 'active':
        return Colors.green;
      case 'hearing_scheduled':
        return Colors.orange;
      case 'closed':
        return Colors.grey;
      default:
        return Colors.blue;
    }
  }

  Color getPriorityColor(String priority) {
    switch (priority) {
      case 'low':
        return Colors.blue;
      case 'medium':
        return Colors.orange;
      case 'high':
        return Colors.red;
      case 'critical':
        return Colors.red.shade900;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.blue[600],
        title: Text('My Cases', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: Column(
        children: [
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.all(12),
            child: Row(
              children: [
                FilterChip(
                  label: Text('All'),
                  selected: selectedFilter == 'all',
                  onSelected: (_) => setState(() => selectedFilter = 'all'),
                  backgroundColor: Colors.grey[200],
                  selectedColor: Colors.blue[600],
                ),
                SizedBox(width: 8),
                FilterChip(
                  label: Text('Open'),
                  selected: selectedFilter == 'open',
                  onSelected: (_) => setState(() => selectedFilter = 'open'),
                  backgroundColor: Colors.grey[200],
                  selectedColor: Colors.blue[600],
                ),
                SizedBox(width: 8),
                FilterChip(
                  label: Text('Active'),
                  selected: selectedFilter == 'active',
                  onSelected: (_) => setState(() => selectedFilter = 'active'),
                  backgroundColor: Colors.grey[200],
                  selectedColor: Colors.blue[600],
                ),
                SizedBox(width: 8),
                FilterChip(
                  label: Text('Closed'),
                  selected: selectedFilter == 'closed',
                  onSelected: (_) => setState(() => selectedFilter = 'closed'),
                  backgroundColor: Colors.grey[200],
                  selectedColor: Colors.blue[600],
                ),
              ],
            ),
          ),

          // Case List
          Expanded(
            child: ListView.builder(
              padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: filteredCases.length,
              itemBuilder: (context, index) {
                final caseItem = filteredCases[index];
                return CaseCard(
                  caseItem: caseItem,
                  statusColor: getStatusColor(caseItem.status),
                  priorityColor: getPriorityColor(caseItem.priority),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// Case Card Widget
class CaseCard extends StatelessWidget {
  final CaseModel caseItem;
  final Color statusColor;
  final Color priorityColor;

  const CaseCard({
    required this.caseItem,
    required this.statusColor,
    required this.priorityColor,
  });

  String formatStatus(String status) {
    return status.replaceAll('_', ' ').toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border(left: BorderSide(color: statusColor, width: 4)),
        ),
        child: InkWell(
          onTap: () {
            // Navigate to case detail
            print('Tapped case: ${caseItem.caseNumber}');
          },
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Case Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            caseItem.caseNumber,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Colors.blue[600],
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            caseItem.title,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey[900],
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: priorityColor.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        caseItem.priority.toUpperCase(),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: priorityColor,
                        ),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 12),

                // Case Description
                Text(
                  caseItem.description,
                  style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: 12),

                // Lawyer & Status Row
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Assigned Lawyer',
                            style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                          ),
                          Text(
                            caseItem.lawyerName,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.grey[800],
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        formatStatus(caseItem.status),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: statusColor,
                        ),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 12),

                // Next Hearing & Meta Row
                if (caseItem.nextHearing != null)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Next Hearing: ${DateFormat('MMM d, yyyy').format(caseItem.nextHearing!)}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.orange[700],
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      SizedBox(height: 8),
                    ],
                  ),

                // Documents & Messages
                Row(
                  children: [
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.description, size: 14, color: Colors.blue[600]),
                          SizedBox(width: 4),
                          Text(
                            '${caseItem.documents} Docs',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(width: 8),
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.message, size: 14, color: Colors.green[600]),
                          SizedBox(width: 4),
                          Text(
                            '${caseItem.messages} Messages',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Case Model
class CaseModel {
  final String id;
  final String caseNumber;
  final String title;
  final String status;
  final String priority;
  final String lawyerName;
  final DateTime? nextHearing;
  final String description;
  final int messages;
  final int documents;
  final double value;

  CaseModel({
    required this.id,
    required this.caseNumber,
    required this.title,
    required this.status,
    required this.priority,
    required this.lawyerName,
    required this.nextHearing,
    required this.description,
    required this.messages,
    required this.documents,
    required this.value,
  });
}
